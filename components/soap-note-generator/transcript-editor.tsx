import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Copy } from "lucide-react";

interface TranscriptEditorProps {
  transcript: string;
  isLoading: boolean;
  currentStep?: 1 | 2;
  onTranscriptChange: (value: string) => void;
  onGenerateSOAP: () => Promise<void>;
  onCopyToClipboard: (text: string) => Promise<void>;
}

export function TranscriptEditor({
  transcript,
  isLoading,
  currentStep,
  onTranscriptChange,
  onGenerateSOAP,
  onCopyToClipboard,
}: TranscriptEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transcript</span>
          {transcript && (
            <Button
              onClick={() => onCopyToClipboard(transcript)}
              variant="outline"
              size="sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Your transcribed text will appear here..."
          className="min-h-32"
        />
        <div className="mt-4">
          <Button
            onClick={onGenerateSOAP}
            disabled={isLoading || !transcript.trim()}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isLoading
              ? currentStep === 1
                ? "Step 1: Extracting Information..."
                : "Step 2: Creating SOAP Note..."
              : "Generate SOAP Note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
