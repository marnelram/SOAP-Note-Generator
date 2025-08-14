import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Upload } from "lucide-react";

interface AudioInputProps {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration?: number;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function AudioInput({
  isRecording,
  isTranscribing,
  recordingDuration = 0,
  onStartRecording,
  onStopRecording,
  onFileUpload,
}: AudioInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

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
          {!isRecording ? (
            <Button
              onClick={onStartRecording}
              disabled={isRecording || isTranscribing}
              size="lg"
              variant="outline"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={onStopRecording}
              disabled={!isRecording || isTranscribing}
              size="lg"
              variant="destructive"
            >
              <MicOff className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

        {(isRecording || isTranscribing) && (
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="animate-pulse">
              {isRecording &&
                `Recording in progress... ${formatDuration(recordingDuration)}`}
              {isTranscribing && "Transcribing with Deepgram Nova-3-Medical..."}
            </Badge>
            {isRecording && recordingDuration > 60 && (
              <div className="text-sm text-muted-foreground">
                Tip: For better results, pause during long silences
              </div>
            )}
            {isTranscribing && (
              <div className="text-sm text-muted-foreground">
                Large files may take a few minutes to process
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
