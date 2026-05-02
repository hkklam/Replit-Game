import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { db } from "@workspace/db";
import { meetingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { speechToText, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GetMeetingParams,
  DeleteMeetingParams,
  DownloadTranscriptParams,
  AnalyzeMeetingParams,
  ExportMeetingParams,
} from "@workspace/api-zod";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
const transcriptsDir = path.join(process.cwd(), "transcripts");
const exportsDir = path.join(process.cwd(), "exports");

for (const dir of [uploadsDir, transcriptsDir, exportsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

function sanitizeName(name: string): string {
  return name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60);
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildMarkdown(meetingName: string, fileId: string, durationSec: number, segments: Array<{ start: number; end: number; text: string }>): string {
  const date = fileId.slice(0, 10);
  const totalMin = Math.floor(durationSec / 60);
  const totalSec = Math.floor(durationSec % 60);
  const durationStr = `${totalMin}m ${String(totalSec).padStart(2, "0")}s`;

  const lines = [
    `# Meeting: ${meetingName}`,
    `Date: ${date}  |  Duration: ${durationStr}`,
    "",
    "---",
    "",
    "## Transcript",
    "",
  ];

  if (segments.length > 0) {
    for (const seg of segments) {
      lines.push(`[${formatTimestamp(seg.start)}] ${seg.text.trim()}`);
    }
  }

  return lines.join("\n");
}

type ActionItem = { owner: string; task: string; dueDate: string; priority: "High" | "Medium" | "Low" };
type AnalysisResult = {
  summary: string;
  action_items: ActionItem[];
  decisions: string[];
  open_questions: string[];
};
type SpeakerSegment = { index: number; speaker: string };

async function diarizeSegments(
  segments: Array<{ start: number; end: number; text: string }>
): Promise<{ speakerSegments: SpeakerSegment[]; costUsd: number }> {
  if (segments.length === 0) return { speakerSegments: [], costUsd: 0 };

  const numbered = segments
    .map((s, i) => `[${i}] ${s.text.trim()}`)
    .join("\n");

  const systemPrompt = `You are a speaker diarization assistant.
Given numbered transcript segments, identify which speaker said each segment.
Use real names if they are mentioned in the text (e.g. "Thanks John", "As Sarah said").
Otherwise use "Speaker 1", "Speaker 2", etc.
Return ONLY valid JSON, no preamble:
{ "speakers": ["name1", "name2"], "assignments": [{ "index": 0, "speaker": "name1" }, ...] }
Every segment index must appear in assignments exactly once.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Assign speakers to each segment:\n\n${numbered}` },
    ],
  });

  const raw = response.choices[0].message.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { speakerSegments: [], costUsd: 0 };
    parsed = JSON.parse(match[0]);
  }

  const assignments = (parsed.assignments ?? []) as Array<{ index: number; speaker: string }>;
  const speakerSegments: SpeakerSegment[] = assignments.map((a) => ({
    index: Number(a.index),
    speaker: String(a.speaker),
  }));

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const costUsd = parseFloat(((inputTokens * 2.5 + outputTokens * 10) / 1_000_000).toFixed(6));

  return { speakerSegments, costUsd };
}

async function analyzeTranscript(transcript: string): Promise<AnalysisResult & { costUsd: number }> {
  const systemPrompt = `You are a professional meeting notes assistant.
Return ONLY valid JSON. No preamble. No markdown fences.
Structure:
{
  "summary": "3-5 sentence plain English summary",
  "action_items": [{ "owner": "", "task": "", "due_date": "", "priority": "High|Medium|Low" }],
  "decisions": ["string"],
  "open_questions": ["string"]
}
Use empty string for missing owner or due_date.
Priority must be exactly High, Medium, or Low.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this transcript:\n\n${transcript}` },
    ],
  });

  const raw = response.choices[0].message.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI returned invalid JSON");
    parsed = JSON.parse(jsonMatch[0]);
  }

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const costUsd = parseFloat(((inputTokens * 2.5 + outputTokens * 10) / 1_000_000).toFixed(6));

  const actionItems: ActionItem[] = ((parsed.action_items ?? []) as Array<Record<string, string>>).map((item) => ({
    owner: item.owner ?? "",
    task: item.task ?? "",
    dueDate: item.due_date ?? "",
    priority: (["High", "Medium", "Low"].includes(item.priority) ? item.priority : "Medium") as ActionItem["priority"],
  }));

  return {
    summary: (parsed.summary as string) ?? "",
    action_items: actionItems,
    decisions: ((parsed.decisions ?? []) as string[]),
    open_questions: ((parsed.open_questions ?? []) as string[]),
    costUsd,
  };
}

async function generateExcel(meeting: typeof meetingsTable.$inferSelect): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ZETA Meeting Notes";

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

  function styleHeader(ws: ExcelJS.Worksheet, cols: string[]) {
    ws.addRow(cols);
    const row = ws.getRow(1);
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle" };
    });
    row.height = 20;
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  function autoFitColumns(ws: ExcelJS.Worksheet) {
    ws.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 60);
    });
  }

  const date = meeting.fileId.slice(0, 10);

  const summary = (meeting.summary as string | null) ?? "";
  const actionItems = ((meeting.actionItems ?? []) as ActionItem[]);
  const decisions = ((meeting.decisions ?? []) as string[]);
  const openQuestions = ((meeting.openQuestions ?? []) as string[]);
  const segments = ((meeting.segments ?? []) as Array<{ start: number; end: number; text: string }>);

  const ws1 = wb.addWorksheet("Summary");
  styleHeader(ws1, ["Field", "Value"]);
  ws1.addRow(["Meeting Name", meeting.meetingName]);
  ws1.addRow(["Date", date]);
  ws1.addRow(["Duration", `${Math.floor(meeting.durationSec / 60)}m ${Math.floor(meeting.durationSec % 60)}s`]);
  ws1.addRow(["Whisper Cost", `$${meeting.costUsd.toFixed(4)}`]);
  ws1.addRow(["Analysis Cost", `$${(meeting.analysisCostUsd ?? 0).toFixed(4)}`]);
  ws1.addRow(["Summary", summary]);
  ws1.getRow(7).getCell(2).alignment = { wrapText: true };
  autoFitColumns(ws1);
  wb.activeSheet = 0;

  const ws2 = wb.addWorksheet("Action Items");
  styleHeader(ws2, ["Owner", "Task", "Due Date", "Priority", "Status", "Notes"]);
  for (const item of actionItems) {
    ws2.addRow([item.owner, item.task, item.dueDate, item.priority, "Open", ""]);
  }
  autoFitColumns(ws2);

  const ws3 = wb.addWorksheet("Decisions");
  styleHeader(ws3, ["#", "Decision"]);
  decisions.forEach((d, i) => ws3.addRow([i + 1, d]));
  autoFitColumns(ws3);

  const ws4 = wb.addWorksheet("Open Questions");
  styleHeader(ws4, ["#", "Question", "Assigned To"]);
  openQuestions.forEach((q, i) => ws4.addRow([i + 1, q, ""]));
  autoFitColumns(ws4);

  const speakerSegments = ((meeting.speakerSegments ?? []) as SpeakerSegment[]);
  const speakerMap = new Map<number, string>(speakerSegments.map((s) => [s.index, s.speaker]));
  const hasSpeakers = speakerSegments.length > 0;

  const ws5 = wb.addWorksheet("Transcript");
  const transcriptHeaders = hasSpeakers ? ["Timestamp", "Speaker", "Text"] : ["Timestamp", "Text"];
  styleHeader(ws5, transcriptHeaders);
  if (segments.length > 0) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (hasSpeakers) {
        ws5.addRow([formatTimestamp(seg.start), speakerMap.get(i) ?? "", seg.text.trim()]);
      } else {
        ws5.addRow([formatTimestamp(seg.start), seg.text.trim()]);
      }
    }
  } else {
    ws5.addRow(hasSpeakers ? ["00:00:00", "", meeting.transcript] : ["00:00:00", meeting.transcript]);
  }
  autoFitColumns(ws5);

  const xlsxPath = path.join(exportsDir, `${meeting.fileId}.xlsx`);
  await wb.xlsx.writeFile(xlsxPath);
  return xlsxPath;
}

router.get("/meetings", async (req, res) => {
  try {
    const meetings = await db.select().from(meetingsTable).orderBy(meetingsTable.createdAt);
    res.json(meetings);
  } catch (err) {
    req.log.error({ err }, "Failed to list meetings");
    res.status(500).json({ error: "Failed to list meetings" });
  }
});

router.get("/meetings/stats", async (req, res) => {
  try {
    const meetings = await db.select().from(meetingsTable);
    const totalMeetings = meetings.length;
    const totalDurationSec = meetings.reduce((s, m) => s + m.durationSec, 0);
    const totalCostUsd = meetings.reduce((s, m) => s + m.costUsd + (m.analysisCostUsd ?? 0), 0);
    const avgDurationSec = totalMeetings > 0 ? totalDurationSec / totalMeetings : 0;
    res.json({ totalMeetings, totalDurationSec, totalCostUsd, avgDurationSec });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/meetings/:id", async (req, res) => {
  const parse = GetMeetingParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid meeting id" });
    return;
  }
  try {
    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, parse.data.id));
    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }
    res.json(meeting);
  } catch (err) {
    req.log.error({ err }, "Failed to get meeting");
    res.status(500).json({ error: "Failed to get meeting" });
  }
});

router.delete("/meetings/:id", async (req, res) => {
  const parse = DeleteMeetingParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid meeting id" });
    return;
  }
  try {
    const [deleted] = await db.delete(meetingsTable).where(eq(meetingsTable.id, parse.data.id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }
    const mdPath = path.join(transcriptsDir, `${deleted.fileId}.md`);
    const txtPath = path.join(transcriptsDir, `${deleted.fileId}.txt`);
    const xlsxPath = path.join(exportsDir, `${deleted.fileId}.xlsx`);
    for (const f of [mdPath, txtPath, xlsxPath]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete meeting");
    res.status(500).json({ error: "Failed to delete meeting" });
  }
});

router.post("/meetings/upload", upload.single("audio_blob"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No audio file received" });
    return;
  }

  const meetingName = (req.body.meeting_name as string) || "Untitled Meeting";
  const now = new Date();
  const datePart = now.toISOString().replace("T", "_").slice(0, 16).replace(":", "-");
  const fileId = `${datePart}_${sanitizeName(meetingName)}`;

  try {
    const audioBuffer = req.file.buffer;
    const { buffer: compatBuffer, format } = await ensureCompatibleFormat(audioBuffer);

    const result = await speechToText(compatBuffer, format);

    type Segment = { start: number; end: number; text: string };
    const segments: Segment[] = Array.isArray((result as Record<string, unknown>).segments)
      ? ((result as Record<string, unknown>).segments as Segment[])
      : [];
    const transcript = typeof result === "string" ? result : (result as Record<string, unknown>).text as string ?? "";

    const durationSec = segments.length > 0 ? Math.max(...segments.map(s => s.end)) : 0;
    const costUsd = parseFloat(((durationSec / 60) * 0.006).toFixed(4));

    const mdContent = buildMarkdown(meetingName, fileId, durationSec, segments);
    const txtContent = transcript;

    fs.writeFileSync(path.join(transcriptsDir, `${fileId}.md`), mdContent, "utf-8");
    fs.writeFileSync(path.join(transcriptsDir, `${fileId}.txt`), txtContent, "utf-8");

    const [meeting] = await db.insert(meetingsTable).values({
      meetingName,
      fileId,
      transcript,
      segments: segments as unknown as Record<string, unknown>[],
      durationSec,
      costUsd,
    }).returning();

    res.json(meeting);
  } catch (err) {
    req.log.error({ err }, "Audio upload/transcription failed");
    res.status(500).json({ error: `Transcription failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

router.get("/meetings/:id/download", async (req, res) => {
  const parse = DownloadTranscriptParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid meeting id" });
    return;
  }
  try {
    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, parse.data.id));
    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }
    const mdPath = path.join(transcriptsDir, `${meeting.fileId}.md`);
    if (!fs.existsSync(mdPath)) {
      const mdContent = buildMarkdown(meeting.meetingName, meeting.fileId, meeting.durationSec, meeting.segments as Array<{ start: number; end: number; text: string }>);
      fs.writeFileSync(mdPath, mdContent, "utf-8");
    }
    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="${meeting.fileId}.md"`);
    res.sendFile(mdPath);
  } catch (err) {
    req.log.error({ err }, "Failed to download transcript");
    res.status(500).json({ error: "Failed to download transcript" });
  }
});

router.post("/meetings/:id/analyze", async (req, res) => {
  const parse = AnalyzeMeetingParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid meeting id" });
    return;
  }
  try {
    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, parse.data.id));
    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    const transcriptText = meeting.transcript || "";
    if (!transcriptText.trim()) {
      res.status(400).json({ error: "Meeting has no transcript to analyze" });
      return;
    }

    const existingSegments = (meeting.segments ?? []) as Array<{ start: number; end: number; text: string }>;
    const [analysis, diarization] = await Promise.all([
      analyzeTranscript(transcriptText),
      diarizeSegments(existingSegments),
    ]);
    const totalAnalysisCost = parseFloat((analysis.costUsd + diarization.costUsd).toFixed(6));

    const [updated] = await db.update(meetingsTable)
      .set({
        summary: analysis.summary,
        actionItems: analysis.action_items as unknown as Record<string, unknown>[],
        decisions: analysis.decisions as unknown as string[],
        openQuestions: analysis.open_questions as unknown as string[],
        analysisCostUsd: totalAnalysisCost,
        speakerSegments: diarization.speakerSegments as unknown as Record<string, unknown>[],
      })
      .where(eq(meetingsTable.id, parse.data.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "AI analysis failed");
    res.status(500).json({ error: `Analysis failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

router.get("/meetings/:id/export", async (req, res) => {
  const parse = ExportMeetingParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid meeting id" });
    return;
  }
  try {
    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, parse.data.id));
    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    const xlsxPath = await generateExcel(meeting);
    const filename = `${sanitizeName(meeting.meetingName)}_${meeting.fileId.slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(xlsxPath);
  } catch (err) {
    req.log.error({ err }, "Excel export failed");
    res.status(500).json({ error: `Export failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

export default router;
