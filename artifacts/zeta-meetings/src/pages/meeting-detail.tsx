import { useState } from "react";
import { Layout } from "@/components/layout";
import { useParams, useLocation } from "wouter";
import { useGetMeeting, useDeleteMeeting, getListMeetingsQueryKey } from "@workspace/api-client-react";
import type { ActionItem, SpeakerSegment } from "@workspace/api-client-react";
import { formatDuration, formatCurrency, formatTimestamp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Trash2, ArrowLeft, FileSpreadsheet, Sparkles, RefreshCw, Globe } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function MeetingDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const { data: meeting, isLoading, refetch } = useGetMeeting(id, { query: { enabled: !!id } });
  const deleteMutation = useDeleteMeeting();

  const handleDownloadTranscript = async () => {
    if (!meeting) return;
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/download`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting.meetingName.replace(/\s+/g, "_")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadExcel = async () => {
    if (!meeting) return;
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting.meetingName.replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    if (!meeting) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }
      await refetch();
      toast({ title: "Analysis complete" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Analysis failed", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
      toast({ title: "Meeting deleted" });
      setLocation("/meetings");
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </Layout>
    );
  }

  if (!meeting) {
    return (
      <Layout>
        <div className="text-center py-20">Meeting not found</div>
      </Layout>
    );
  }

  const actionItems = (meeting.actionItems ?? []) as ActionItem[];
  const decisions = (meeting.decisions ?? []) as string[];
  const openQuestions = (meeting.openQuestions ?? []) as string[];
  const speakerSegments = (meeting.speakerSegments ?? []) as SpeakerSegment[];
  const speakerMap = new Map<number, string>(speakerSegments.map((s) => [s.index, s.speaker]));
  const uniqueSpeakers = [...new Set(speakerSegments.map((s) => s.speaker))];
  const hasAnalysis = !!meeting.summary;
  const isTranslated = !!meeting.originalTranscript && !!meeting.detectedLanguage;
  const totalCost = meeting.costUsd + (meeting.analysisCostUsd ?? 0) + (meeting.translationCostUsd ?? 0);

  const LANG_NAMES: Record<string, string> = {
    zh: "Mandarin Chinese", es: "Spanish", pt: "Brazilian Portuguese", sv: "Swedish",
    "zh-CN": "Mandarin Chinese", "zh-TW": "Traditional Chinese",
    fr: "French", de: "German", ja: "Japanese", ko: "Korean", ar: "Arabic",
    ru: "Russian", it: "Italian", nl: "Dutch", pl: "Polish",
  };
  const detectedLangName = meeting.detectedLanguage
    ? (LANG_NAMES[meeting.detectedLanguage] ?? meeting.detectedLanguage.toUpperCase())
    : null;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in">
        <Link href="/meetings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to History
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{meeting.meetingName}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{format(new Date(meeting.createdAt), "MMMM d, yyyy")}</span>
              <span>·</span>
              <span>{formatDuration(meeting.durationSec)}</span>
              <span>·</span>
              <span>Transcription: {formatCurrency(meeting.costUsd)}</span>
              {meeting.analysisCostUsd != null && (
                <>
                  <span>·</span>
                  <span>Analysis: {formatCurrency(meeting.analysisCostUsd)}</span>
                </>
              )}
              {(meeting.analysisCostUsd != null || isTranslated) && (
                <>
                  <span>·</span>
                  <span className="text-primary font-medium">Total: {formatCurrency(totalCost)}</span>
                </>
              )}
            </div>
            {isTranslated && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-3 py-1 w-fit">
                <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                Translated from {detectedLangName} — original transcript preserved
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!hasAnalysis && (
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing} className="gap-1.5">
                {analyzing
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analyzing...</>
                  : <><Sparkles className="h-3.5 w-3.5" /> Analyze</>
                }
              </Button>
            )}
            {hasAnalysis && (
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing} className="gap-1.5 text-muted-foreground">
                {analyzing
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Re-analyzing...</>
                  : <><RefreshCw className="h-3.5 w-3.5" /> Re-analyze</>
                }
              </Button>
            )}
            <Button onClick={handleDownloadTranscript} variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Transcript
            </Button>
            <Button onClick={handleDownloadExcel} size="sm" className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="icon" disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue={hasAnalysis ? "summary" : "transcript"}>
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
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            {hasAnalysis ? (
              <p className="text-sm leading-relaxed text-foreground">{meeting.summary}</p>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-border rounded-lg border-dashed">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No analysis yet.</p>
                <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={handleAnalyze} disabled={analyzing}>
                  <Sparkles className="h-3.5 w-3.5" /> Run Analysis
                </Button>
              </div>
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
              <div className="text-center py-8 text-sm text-muted-foreground italic">
                {hasAnalysis ? "No action items found." : "Run analysis to extract action items."}
              </div>
            )}
          </TabsContent>

          <TabsContent value="decisions">
            {decisions.length > 0 ? (
              <ol className="space-y-2 text-sm text-foreground list-decimal list-inside leading-relaxed">
                {decisions.map((d, i) => <li key={i}>{d}</li>)}
              </ol>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground italic">
                {hasAnalysis ? "No decisions recorded." : "Run analysis to identify decisions."}
              </div>
            )}
          </TabsContent>

          <TabsContent value="questions">
            {openQuestions.length > 0 ? (
              <ol className="space-y-2 text-sm text-foreground list-decimal list-inside leading-relaxed">
                {openQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground italic">
                {hasAnalysis ? "No open questions found." : "Run analysis to surface open questions."}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transcript">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              {speakerSegments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uniqueSpeakers.map((speaker) => (
                    <span key={speaker} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${speakerColor(speaker, uniqueSpeakers)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {speaker}
                    </span>
                  ))}
                </div>
              )}
              {isTranslated && (
                <div className="flex items-center gap-2 text-xs ml-auto">
                  <button
                    onClick={() => setShowOriginal(false)}
                    className={`px-3 py-1.5 rounded-l-md border border-r-0 transition-colors ${!showOriginal ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    English (Translated)
                  </button>
                  <button
                    onClick={() => setShowOriginal(true)}
                    className={`px-3 py-1.5 rounded-r-md border transition-colors ${showOriginal ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    {detectedLangName} (Original)
                  </button>
                </div>
              )}
            </div>
            <div className="bg-card border border-border rounded-lg p-6 md:p-8 font-serif text-[15px] leading-loose text-card-foreground shadow-sm">
              {showOriginal && isTranslated ? (
                <div className="whitespace-pre-wrap">{meeting.originalTranscript}</div>
              ) : meeting.segments && (meeting.segments as unknown[]).length > 0 ? (
                <div className="space-y-3">
                  {(meeting.segments as Array<{ start: number; end: number; text: string }>).map((seg, i) => {
                    const speaker = speakerMap.get(i);
                    return (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-muted-foreground font-mono text-xs mt-1.5 shrink-0 opacity-70 w-16">
                          {formatTimestamp(seg.start)}
                        </span>
                        {speaker && (
                          <span className={`shrink-0 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight ${speakerColor(speaker, uniqueSpeakers)}`}>
                            {speaker}
                          </span>
                        )}
                        <span className="leading-relaxed">{seg.text}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{meeting.transcript || "No transcript content available."}</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
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

const SPEAKER_PALETTES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function speakerColor(speaker: string, allSpeakers: string[]): string {
  const idx = allSpeakers.indexOf(speaker);
  return SPEAKER_PALETTES[idx % SPEAKER_PALETTES.length] ?? "bg-muted text-muted-foreground";
}
