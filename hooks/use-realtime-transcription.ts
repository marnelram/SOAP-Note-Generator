import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "./use-toast";

interface UseRealtimeTranscriptionReturn {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  isConnecting: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useRealtimeTranscription(): UseRealtimeTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const { toast } = useToast();

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    setIsRecording(false);
    setIsConnecting(false);
    setInterimTranscript("");
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setIsConnecting(true);

      // Get configuration from the server
      const response = await fetch("/api/transcribe-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (!response.ok) {
        throw new Error("Failed to get transcription configuration");
      }

      const { key, url, config } = await response.json();

      // Create WebSocket connection to Deepgram
      const params = new URLSearchParams({
        ...config,
        token: key,
      });

      const wsUrl = `${url}?${params.toString()}`;
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to Deepgram");
        setIsConnecting(false);
        setIsRecording(true);

        toast({
          title: "Real-time Transcription Started",
          description: "Speaking now, transcription will appear in real-time",
        });
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "Results") {
          const transcript = data.channel?.alternatives?.[0]?.transcript;

          if (transcript && transcript.trim() !== "") {
            if (data.is_final) {
              // Final transcript - append to the main transcript
              setTranscript((prev) => prev + (prev ? " " : "") + transcript);
              setInterimTranscript(""); // Clear interim when we get final
            } else {
              // Interim transcript - show in real-time
              setInterimTranscript(transcript);
            }
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to transcription service",
          variant: "destructive",
        });
        stopRecording();
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsRecording(false);
        setIsConnecting(false);
      };

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      streamRef.current = stream;

      // Create audio context for processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      // Process audio data and send to WebSocket
      processor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);

          // Convert float32 to int16
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Array[i] = Math.max(
              -32768,
              Math.min(32767, inputData[i] * 32768)
            );
          }

          // Send binary audio data
          ws.send(int16Array.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description:
          "Failed to start real-time transcription. Please check permissions.",
        variant: "destructive",
      });
      setIsConnecting(false);
      stopRecording();
    }
  }, [toast, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  const updateTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    transcript,
    interimTranscript,
    isConnecting,
    startRecording,
    stopRecording,
    clearTranscript,
    setTranscript: updateTranscript,
  };
}
