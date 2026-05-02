import { useState, useRef, useCallback } from "react";
import { useUploadAudio } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type RecordingState = "idle" | "recording" | "uploading" | "transcribing" | "done" | "error";

export function useAudioRecorder(meetingName: string, onDone: (meeting: any) => void) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const uploadMutation = useUploadAudio();
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    if (!meetingName.trim()) {
      toast({ title: "Meeting name required", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ""; // Let browser choose
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        chunksRef.current = [];
        
        setState("uploading");
        
        try {
          setState("transcribing");
          const meeting = await uploadMutation.mutateAsync({
            data: {
              audio_blob: blob,
              meeting_name: meetingName
            }
          });
          setState("done");
          onDone(meeting);
        } catch (err: any) {
          setState("error");
          setErrorMessage(err.message || "Transcription failed");
        }
      };

      mediaRecorder.start(250);
      setState("recording");
      setElapsedSec(0);
      timerRef.current = setInterval(() => {
        setElapsedSec(s => s + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  }, [meetingName, uploadMutation, onDone, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setElapsedSec(0);
    setErrorMessage("");
  }, []);

  return {
    state,
    elapsedSec,
    errorMessage,
    startRecording,
    stopRecording,
    reset
  };
}
