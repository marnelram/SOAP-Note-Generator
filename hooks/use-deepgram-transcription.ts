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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
      mediaRecorder.start();
      setIsRecording(true);

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
    startRecording,
    stopRecording,
    transcribeFile,
    clearTranscript,
    setTranscript: updateTranscript,
  };
}

async function transcribeAudio(audioData: Blob | File): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioData);

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Transcription failed");
  }

  const result: DeepgramTranscriptionResult = await response.json();
  return result.transcript;
}
