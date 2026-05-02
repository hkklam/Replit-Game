import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { formatDuration, formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Download, RefreshCw, FileText } from "lucide-react";
import type { Meeting } from "@workspace/api-client-react";

export default function Home() {
  const [meetingName, setMeetingName] = useState("");
  const [result, setResult] = useState<Meeting | null>(null);

  const { state, elapsedSec, errorMessage, startRecording, stopRecording, reset } = useAudioRecorder(meetingName, (meeting) => {
    setResult(meeting);
  });

  const handleDownload = async () => {
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

  const handleReset = () => {
    setMeetingName("");
    setResult(null);
    reset();
  };

  const isProcessing = state === "uploading" || state === "transcribing";

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">New Meeting</h1>
          <p className="text-muted-foreground">Record your meeting and get a clean transcript instantly.</p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-6">
            {state === "idle" || state === "recording" || isProcessing ? (
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
                    <Button 
                      onClick={startRecording} 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-32"
                    >
                      <Mic className="h-4 w-4" /> Start
                    </Button>
                  ) : state === "recording" ? (
                    <Button 
                      onClick={stopRecording} 
                      variant="destructive" 
                      className="gap-2 w-32"
                    >
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

                {/* Status Area */}
                <div className="pt-4 border-t border-border/50 text-sm">
                  {state === "idle" && <span className="text-muted-foreground">Ready to record.</span>}
                  {state === "recording" && <span className="text-primary font-medium">Recording in progress...</span>}
                  {state === "uploading" && <span className="text-muted-foreground">Uploading audio...</span>}
                  {state === "transcribing" && <span className="text-muted-foreground">Transcribing... this may take a moment.</span>}
                  {state === "error" && <span className="text-destructive font-medium">Error: {errorMessage}</span>}
                </div>
              </div>
            ) : null}

            {state === "done" && result && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in">
                <div className="flex items-start justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="font-semibold text-lg">{result.meetingName}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Duration: {formatDuration(result.durationSec)}</span>
                      <span>Cost: {formatCurrency(result.costUsd)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                      New Recording
                    </Button>
                    <Button onClick={handleDownload} className="gap-2">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Transcript
                  </h4>
                  <div className="bg-secondary/50 rounded-md p-4 max-h-[400px] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-serif">
                    {result.transcript || "No transcript generated."}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
