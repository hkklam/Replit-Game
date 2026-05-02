import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListMeetings, useGetMeetingStats } from "@workspace/api-client-react";
import { formatDuration, formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Clock, DollarSign, Calendar, ChevronRight, Search, X, FileText, AlignLeft } from "lucide-react";
import { format } from "date-fns";

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function getSnippet(text: string, query: string, windowSize = 80): string {
  if (!query.trim() || !text) return "";
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + windowSize - 30);
  const snippet = text.slice(start, end);
  return (start > 0 ? "…" : "") + snippet + (end < text.length ? "…" : "");
}

export default function Meetings() {
  const { data: meetings, isLoading: loadingMeetings } = useListMeetings();
  const { data: stats, isLoading: loadingStats } = useGetMeetingStats();
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();

  const filtered = meetings
    ? meetings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .filter((m) => {
          if (!trimmed) return true;
          const inName = m.meetingName.toLowerCase().includes(trimmed);
          const inTranscript = m.transcript?.toLowerCase().includes(trimmed) ?? false;
          const inSummary = (m.summary ?? "").toLowerCase().includes(trimmed);
          return inName || inTranscript || inSummary;
        })
    : [];

  const transcriptHit = (m: (typeof filtered)[number]) =>
    trimmed && !(m.meetingName.toLowerCase().includes(trimmed)) && m.transcript?.toLowerCase().includes(trimmed);

  const summaryHit = (m: (typeof filtered)[number]) =>
    trimmed && !(m.meetingName.toLowerCase().includes(trimmed)) && (m.summary ?? "").toLowerCase().includes(trimmed);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">History</h1>
          <p className="text-muted-foreground">Review your past recordings and transcripts.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingStats ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : stats ? (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Total Meetings</div>
                  <div className="text-2xl font-bold">{stats.totalMeetings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Total Duration
                  </div>
                  <div className="text-2xl font-bold">{formatDuration(stats.totalDurationSec)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Total Cost
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalCostUsd)}</div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Search + List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3 gap-4">
            <h2 className="font-semibold text-lg shrink-0">
              {trimmed
                ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"`
                : "Recent Recordings"}
            </h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search meetings, transcripts, summaries…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9 text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {loadingMeetings ? (
            Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)
          ) : filtered.length > 0 ? (
            <div className="divide-y border border-border rounded-lg bg-card overflow-hidden">
              {filtered.map((meeting) => {
                const showTranscriptSnippet = transcriptHit(meeting);
                const showSummarySnippet = summaryHit(meeting) && !showTranscriptSnippet;
                const transcriptSnippet = showTranscriptSnippet
                  ? getSnippet(meeting.transcript ?? "", query)
                  : "";
                const summarySnippet = showSummarySnippet
                  ? getSnippet(meeting.summary ?? "", query)
                  : "";

                return (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="flex items-start justify-between p-4 hover:bg-secondary/50 transition-colors gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">
                        {highlight(meeting.meetingName, query)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meeting.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(meeting.durationSec)}
                        </span>
                      </div>
                      {transcriptSnippet && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <AlignLeft className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                          <span className="italic leading-snug">{highlight(transcriptSnippet, query)}</span>
                        </div>
                      )}
                      {summarySnippet && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                          <span className="italic leading-snug">{highlight(summarySnippet, query)}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  </Link>
                );
              })}
            </div>
          ) : trimmed ? (
            <div className="text-center py-12 text-muted-foreground border border-border rounded-lg bg-card border-dashed">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No meetings matched <span className="font-medium">"{query}"</span>.</p>
              <button onClick={() => setQuery("")} className="mt-3 text-xs text-primary hover:underline">
                Clear search
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-border rounded-lg bg-card border-dashed">
              No meetings recorded yet.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
