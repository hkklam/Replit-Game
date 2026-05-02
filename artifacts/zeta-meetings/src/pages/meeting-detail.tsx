import { Layout } from "@/components/layout";
import { useParams, useLocation } from "wouter";
import { useGetMeeting, useDeleteMeeting, getListMeetingsQueryKey } from "@workspace/api-client-react";
import { formatDuration, formatCurrency, formatTimestamp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Trash2, ArrowLeft } from "lucide-react";
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

  const { data: meeting, isLoading } = useGetMeeting(id, { query: { enabled: !!id } });
  const deleteMutation = useDeleteMeeting();

  const handleDownload = async () => {
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
      toast({ title: "Meeting deleted" });
      setLocation("/meetings");
    } catch (err) {
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

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in">
        <Link href="/meetings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to History
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{meeting.meetingName}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{format(new Date(meeting.createdAt), "MMMM d, yyyy")}</span>
              <span>•</span>
              <span>{formatDuration(meeting.durationSec)}</span>
              <span>•</span>
              <span>{formatCurrency(meeting.costUsd)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownload} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="icon" disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 md:p-8 font-serif text-[15px] leading-loose text-card-foreground shadow-sm">
          {meeting.segments && meeting.segments.length > 0 ? (
            <div className="space-y-4">
              {meeting.segments.map((seg, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-muted-foreground font-mono text-xs mt-1.5 shrink-0 opacity-70">
                    {formatTimestamp(seg.start)}
                  </span>
                  <span>{seg.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{meeting.transcript || "No transcript content available."}</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
