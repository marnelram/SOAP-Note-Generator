import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Upload } from "lucide-react";

interface AudioInputProps {
  isRecording: boolean;
  isTranscribing?: boolean;
  isConnecting?: boolean;
  transcript?: string;
  interimTranscript?: string;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function AudioInput({
  isRecording,
  isTranscribing,
  isConnecting,
  transcript,
  interimTranscript,
  onStartRecording,
  onStopRecording,
  onFileUpload,
}: AudioInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Describe Your Encounter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Recording */}
        <div className="space-y-2 w-full justify-center flex">
          {!isRecording && !isConnecting ? (
            <Button
              onClick={onStartRecording}
              disabled={isRecording || isTranscribing || isConnecting}
              size="lg"
              variant="outline"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Real-time Recording
            </Button>
          ) : (
            <Button
              onClick={onStopRecording}
              disabled={!isRecording && !isConnecting}
              size="lg"
              variant="destructive"
            >
              <MicOff className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

        {/* Status indicators */}
        {(isConnecting || isRecording || isTranscribing) && (
          <div className="text-center">
            <Badge variant="secondary" className="animate-pulse">
              {isConnecting && "Connecting to transcription service..."}
              {isRecording && "Recording - speak now"}
              {isTranscribing && "Transcribing with Deepgram Nova-3-Medical..."}
            </Badge>
          </div>
        )}

        {/* Real-time transcript display */}
        {(transcript || interimTranscript) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Live Transcript:
            </h4>
            <div className="p-3 bg-muted rounded-md text-sm min-h-[60px] max-h-[200px] overflow-y-auto">
              {transcript && (
                <span className="text-foreground">{transcript}</span>
              )}
              {interimTranscript && (
                <span className="text-muted-foreground italic">
                  {transcript ? " " : ""}
                  {interimTranscript}
                </span>
              )}
              {!transcript && !interimTranscript && (
                <span className="text-muted-foreground">
                  Transcript will appear here as you speak...
                </span>
              )}
            </div>
          </div>
        )}

        {/* File upload (optional) */}
        {onFileUpload && (
          <div className="space-y-2">
            <div className="text-center text-sm text-muted-foreground">or</div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isRecording || isTranscribing || isConnecting}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Audio File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={onFileUpload}
              className="hidden"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
