import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Upload } from "lucide-react";

interface AudioInputProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function AudioInput({
  isRecording,
  isTranscribing,
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
          Audio Input
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
              className="bg-green-600 hover:bg-green-700"
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
          <div className="text-center">
            <Badge variant="secondary" className="animate-pulse">
              {isRecording && "Recording in progress..."}
              {isTranscribing && "Transcribing with Deepgram Nova-3-Medical..."}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
