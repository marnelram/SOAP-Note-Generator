import { useState, useRef, useCallback } from "react";
import { useToast } from "./use-toast";

interface DeepgramTranscriptionResult {
  transcript: string;
  confidence: number;
  metadata: {
    duration: number;
    model: string;
    language: string;
  };
}

interface UseDeepgramTranscriptionReturn {
  isRecording: boolean;
  transcript: string;
  isTranscribing: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcribeFile: (file: File) => Promise<string>;
  clearTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useDeepgramTranscription(): UseDeepgramTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);

        try {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          const transcriptText = await transcribeAudio(audioBlob);
          setTranscript(transcriptText);
        } catch (error) {
          console.error("Transcription error:", error);
          toast({
            title: "Transcription Error",
            description: "Failed to transcribe audio. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsTranscribing(false);
        }

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      // Start recording with timeslice for chunked data (every 10 seconds)
      // This helps with memory management for long recordings
      mediaRecorder.start(10000);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer for recording duration
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description:
          "Recording audio for transcription with Deepgram Nova-3-Medical",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Clear recording timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  const transcribeFile = useCallback(
    async (file: File): Promise<string> => {
      setIsTranscribing(true);

      try {
        const transcriptText = await transcribeAudio(file);
        setTranscript(transcriptText);
        return transcriptText;
      } catch (error) {
        console.error("File transcription error:", error);
        toast({
          title: "Transcription Error",
          description: "Failed to transcribe audio file. Please try again.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsTranscribing(false);
      }
    },
    [toast]
  );

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  const updateTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  return {
    isRecording,
    transcript,
    isTranscribing,
    recordingDuration,
    startRecording,
    stopRecording,
    transcribeFile,
    clearTranscript,
    setTranscript: updateTranscript,
  };
}

async function transcribeAudio(audioData: Blob | File): Promise<string> {
  // Check file size (Deepgram limit is 2GB, but we'll set a reasonable limit)
  const maxSizeBytes = 500 * 1024 * 1024; // 500MB
  const fileSize = audioData instanceof File ? audioData.size : audioData.size;

  if (fileSize > maxSizeBytes) {
    throw new Error(
      `Audio file too large. Maximum size allowed is ${
        maxSizeBytes / (1024 * 1024)
      }MB`
    );
  }

  const formData = new FormData();
  formData.append("audio", audioData);

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
      signal: controller.signal,
      // Add headers for large file upload
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Transcription failed");
    }

    const result: DeepgramTranscriptionResult = await response.json();
    return result.transcript;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Transcription timed out. Please try with a shorter audio file."
      );
    }
    throw error;
  }
}
