import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { meetingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { speechToText, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import {
  GetMeetingParams,
  DeleteMeetingParams,
  DownloadTranscriptParams,
} from "@workspace/api-zod";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
const transcriptsDir = path.join(process.cwd(), "transcripts");

for (const dir of [uploadsDir, transcriptsDir]) {
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
    const totalCostUsd = meetings.reduce((s, m) => s + m.costUsd, 0);
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
    for (const f of [mdPath, txtPath]) {
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

export default router;
