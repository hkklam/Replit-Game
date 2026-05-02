import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { formatDuration, formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Square, Download, RefreshCw, TableProperties, Sparkles, FileSpreadsheet } from "lucide-react";
import type { Meeting, ActionItem } from "@workspace/api-client-react";

export default function Home() {
  const [meetingName, setMeetingName] = useState("");
  const [result, setResult] = useState<Meeting | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { state, elapsedSec, errorMessage, startRecording, stopRecording, reset } = useAudioRecorder(meetingName, async (meeting) => {
    setResult(meeting);
    await runAnalysis(meeting);
  });

  async function runAnalysis(meeting: Meeting) {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }
      const analyzed: Meeting = await res.json();
      setResult(analyzed);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const handleDownloadTranscript = async () => {
    if (!result) return;
    try {
      const res = await fetch(`/api/meetings/${result.id}/download`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.meetingName.replace(/\s+/g, "_")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadExcel = async () => {
    if (!result) return;
    try {
      const res = await fetch(`/api/meetings/${result.id}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.meetingName.replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    setMeetingName("");
    setResult(null);
    setAnalysisError(null);
    reset();
  };

  const isProcessing = state === "uploading" || state === "transcribing";
  const actionItems = (result?.actionItems ?? []) as ActionItem[];
  const decisions = (result?.decisions ?? []) as string[];
  const openQuestions = (result?.openQuestions ?? []) as string[];
  const hasAnalysis = !!result?.summary;
  const totalCost = (result?.costUsd ?? 0) + (result?.analysisCostUsd ?? 0);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">New Meeting</h1>
          <p className="text-muted-foreground">Record your meeting and get a clean transcript instantly.</p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-6">
            {(state === "idle" || state === "recording" || isProcessing) && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="meeting-name">
                    Meeting Name
                  </label>
                  <Input
                    id="meeting-name"
                    placeholder="Weekly Sync..."
                    value={meetingName}
                    onChange={(e) => setMeetingName(e.target.value)}
                    disabled={state !== "idle"}
                    className="max-w-md bg-background"
                  />
                </div>

                <div className="flex items-center gap-4">
                  {state === "idle" ? (
                    <Button onClick={startRecording} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-32">
                      <Mic className="h-4 w-4" /> Start
                    </Button>
                  ) : state === "recording" ? (
                    <Button onClick={stopRecording} variant="destructive" className="gap-2 w-32">
                      <Square className="h-4 w-4" fill="currentColor" /> Stop
                    </Button>
                  ) : (
                    <Button disabled className="gap-2 w-32">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Processing
                    </Button>
                  )}
                  {state === "recording" && (
                    <div className="flex items-center gap-2 text-destructive font-medium animate-in fade-in">
                      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      {formatDuration(elapsedSec)}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/50 text-sm">
                  {state === "idle" && <span className="text-muted-foreground">Ready to record.</span>}
                  {state === "recording" && <span className="text-primary font-medium">Recording in progress...</span>}
                  {state === "uploading" && <span className="text-muted-foreground">Uploading audio...</span>}
                  {state === "transcribing" && <span className="text-muted-foreground">Transcribing... this may take a moment.</span>}
                  {state === "error" && <span className="text-destructive font-medium">Error: {errorMessage}</span>}
                </div>
              </div>
            )}

            {state === "done" && result && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in">
                {/* Header row */}
                <div className="flex items-start justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="font-semibold text-lg">{result.meetingName}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Duration: {formatDuration(result.durationSec)}</span>
                      <span>Whisper: {formatCurrency(result.costUsd)}</span>
                      {result.analysisCostUsd != null && (
                        <span>Analysis: {formatCurrency(result.analysisCostUsd)}</span>
                      )}
                      {result.analysisCostUsd != null && (
                        <span className="text-primary font-medium">Total: {formatCurrency(totalCost)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      New Recording
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadTranscript} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Transcript
                    </Button>
                    {hasAnalysis && (
                      <Button size="sm" onClick={handleDownloadExcel} className="gap-1.5">
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Analysis loading / error */}
                {analyzing && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
                    <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                    Analyzing with AI — building summary and action items...
                  </div>
                )}
                {analysisError && (
                  <div className="text-sm text-destructive">Analysis failed: {analysisError}</div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="summary">
                  <TabsList className="mb-4">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="actions">
                      Action Items
                      {actionItems.length > 0 && (
                        <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                          {actionItems.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="decisions">Decisions</TabsTrigger>
                    <TabsTrigger value="questions">Open Questions</TabsTrigger>
                    <TabsTrigger value="transcript">
                      <TableProperties className="h-3.5 w-3.5 mr-1" /> Transcript
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary">
                    {result.summary ? (
                      <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{analyzing ? "Generating summary..." : "No summary available."}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="actions">
                    {actionItems.length > 0 ? (
                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                              <th className="text-left px-3 py-2 font-semibold">Owner</th>
                              <th className="text-left px-3 py-2 font-semibold">Task</th>
                              <th className="text-left px-3 py-2 font-semibold">Due</th>
                              <th className="text-left px-3 py-2 font-semibold">Priority</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {actionItems.map((item, i) => (
                              <tr key={i} className="hover:bg-secondary/30 transition-colors">
                                <td className="px-3 py-2.5 font-medium text-foreground">{item.owner || "—"}</td>
                                <td className="px-3 py-2.5 text-foreground">{item.task}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.dueDate || "—"}</td>
                                <td className="px-3 py-2.5">
                                  <PriorityBadge priority={item.priority} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{analyzing ? "Extracting action items..." : "No action items found."}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="decisions">
                    {decisions.length > 0 ? (
                      <ol className="space-y-2 text-sm text-foreground list-decimal list-inside leading-relaxed">
                        {decisions.map((d, i) => <li key={i}>{d}</li>)}
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{analyzing ? "Identifying decisions..." : "No decisions recorded."}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="questions">
                    {openQuestions.length > 0 ? (
                      <ol className="space-y-2 text-sm text-foreground list-decimal list-inside leading-relaxed">
                        {openQuestions.map((q, i) => <li key={i}>{q}</li>)}
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{analyzing ? "Finding open questions..." : "No open questions found."}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="transcript">
                    <div className="bg-secondary/50 rounded-md p-4 max-h-[400px] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-serif">
                      {result.transcript || "No transcript generated."}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    High: "bg-destructive/10 text-destructive",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${styles[priority] ?? "bg-muted text-muted-foreground"}`}>
      {priority}
    </span>
  );
}
