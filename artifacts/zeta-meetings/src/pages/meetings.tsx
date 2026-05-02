import { Layout } from "@/components/layout";
import { useListMeetings, useGetMeetingStats } from "@workspace/api-client-react";
import { formatDuration, formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Clock, DollarSign, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function Meetings() {
  const { data: meetings, isLoading: loadingMeetings } = useListMeetings();
  const { data: stats, isLoading: loadingStats } = useGetMeetingStats();

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

        {/* List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Recent Recordings</h2>
          {loadingMeetings ? (
            Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)
          ) : meetings && meetings.length > 0 ? (
            <div className="divide-y border border-border rounded-lg bg-card overflow-hidden">
              {meetings.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(meeting => (
                <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                  <div>
                    <div className="font-medium text-foreground">{meeting.meetingName}</div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(meeting.createdAt), "MMM d, yyyy h:mm a")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(meeting.durationSec)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              ))}
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
