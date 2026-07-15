import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "./use-toast";

interface DeepgramResponse {
  type: string;
  channel_index?: number[];
  duration?: number;
  start?: number;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript: string;
      confidence: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
  metadata?: {
    request_id: string;
    model_info: {
      name: string;
      version: string;
      arch: string;
    };
    model_uuid: string;
  };
}

interface UseRealtimeTranscriptionReturn {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  isConnecting: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  startRecording: (options?: Record<string, any>) => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  setTranscript: (text: string) => void;
  confidence: number | null;
}

export function useRealtimeTranscription(): UseRealtimeTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [confidence, setConfidence] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);
  // Distinguishes a user-initiated stop from an unexpected drop, so we only
  // auto-reconnect on the latter.
  const manualStopRef = useRef(false);

  const { toast } = useToast();

  // Tear down mic/audio/socket without touching reconnect bookkeeping, so it
  // can be reused both for a full stop and between reconnect attempts.
  const teardownAudio = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // already stopped
      }
    }

    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: "CloseStream" }));
      }
      // Drop handlers so a closing socket can't trigger another reconnect.
      websocketRef.current.onclose = null;
      websocketRef.current.onerror = null;
      websocketRef.current.close();
      websocketRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    manualStopRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttempts.current = 0;

    teardownAudio();

    setIsRecording(false);
    setIsConnecting(false);
    setConnectionStatus("disconnected");
    setInterimTranscript("");
    setConfidence(null);
  }, [teardownAudio]);

  const startRecording = useCallback(
    async (customOptions?: Record<string, any>) => {
      // Fresh attempt initiated by the user — allow reconnects again.
      manualStopRef.current = false;

      try {
        setIsConnecting(true);
        setConnectionStatus("connecting");

        const response = await fetch("/api/transcribe-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            options: customOptions,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to get transcription configuration: ${
              errorData.error || response.statusText
            }`,
          );
        }

        const { key, url, config, metadata } = await response.json();

        // Create WebSocket connection to Deepgram.
        // The API key must be passed via the Sec-WebSocket-Protocol subprotocol
        // (["token", key]) — browsers can't set an Authorization header, and
        // Deepgram rejects the key as a query param with 401 INVALID_AUTH.
        const params = new URLSearchParams(config);

        const wsUrl = `${url}?${params.toString()}`;
        const ws = new WebSocket(wsUrl, ["token", key]);
        websocketRef.current = ws;

        // Reconnect with exponential backoff unless the user stopped on purpose
        // or we've exhausted our retries. Shared by onerror and onclose.
        const scheduleReconnect = () => {
          if (manualStopRef.current) return;
          // A reconnect is already queued (e.g. onerror + onclose both fired).
          if (reconnectTimeoutRef.current) return;

          const maxRetries = 3;
          if (reconnectAttempts.current < maxRetries) {
            reconnectAttempts.current++;
            setConnectionStatus("connecting");
            const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 2s, 4s, 8s

            // Drop the current audio graph/socket before reopening a new one.
            teardownAudio();

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              console.log(
                `Attempting to reconnect (attempt ${reconnectAttempts.current}/${maxRetries})`,
              );
              startRecording(customOptions);
            }, delay);
          } else {
            toast({
              title: "Connection Lost",
              description:
                "Unable to reconnect to the transcription service. Please try again.",
              variant: "destructive",
            });
            stopRecording();
          }
        };

        ws.onopen = () => {
          console.log("WebSocket connected to Deepgram");
          setIsConnecting(false);
          setIsRecording(true);
          setConnectionStatus("connected");
          reconnectAttempts.current = 0;

          // Keep the connection alive through pauses in speech. Without this,
          // Deepgram closes the socket (NET-0001) after ~10s of no audio.
          if (keepAliveRef.current) clearInterval(keepAliveRef.current);
          keepAliveRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "KeepAlive" }));
            }
          }, 5000);

          toast({
            title: "Transcription Started",
          });
        };

        ws.onmessage = (event) => {
          try {
            const data: DeepgramResponse = JSON.parse(event.data);

            if (data.type === "Results") {
              const alternative = data.channel?.alternatives?.[0];
              const transcript = alternative?.transcript;
              const currentConfidence = alternative?.confidence;

              if (transcript && transcript.trim() !== "") {
                if (currentConfidence !== undefined) {
                  setConfidence(currentConfidence);
                }

                if (data.is_final || data.speech_final) {
                  setTranscript(
                    (prev) => prev + (prev ? " " : "") + transcript,
                  );
                  setInterimTranscript("");
                } else {
                  setInterimTranscript(transcript);
                }
              }
            }
          } catch (parseError) {
            console.error(
              "Error parsing Deepgram message:",
              parseError,
              event.data,
            );
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          // Don't reconnect here — onclose fires right after and owns recovery.
          // (Reconnecting in both races two attempts against each other.)
          if (!manualStopRef.current) {
            setConnectionStatus("error");
          }
        };

        ws.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason);
          setIsRecording(false);
          setIsConnecting(false);

          if (manualStopRef.current || event.code === 1000) {
            // Intentional / normal closure — leave things stopped.
            setConnectionStatus("disconnected");
            return;
          }

          // Unexpected drop (e.g. Deepgram NET-0001 timeout, network blip) —
          // try to recover the session instead of silently freezing.
          toast({
            title: "Reconnecting…",
            description: "The transcription connection dropped. Reconnecting…",
          });
          scheduleReconnect();
        };

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
            channelCount: 1,
          },
        });

        streamRef.current = stream;

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(1024, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);

            // float32 [-1,1] → int16 PCM for Deepgram
            const int16Array = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16Array[i] = Math.max(
                -32768,
                Math.min(32767, inputData[i] * 32768),
              );
            }

            ws.send(int16Array.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      } catch (error) {
        console.error("Error starting recording:", error);
        setConnectionStatus("error");

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        toast({
          title: "Recording Error",
          description: `Failed to start transcription: ${errorMessage}`,
          variant: "destructive",
        });
        setIsConnecting(false);
        stopRecording();
      }
    },
    [toast, stopRecording],
  );

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
    connectionStatus,
    confidence,
    startRecording,
    stopRecording,
    clearTranscript,
    setTranscript: updateTranscript,
  };
}
