import { cn } from "@/lib/utils";
import { Header } from "./header";
import { AudioInput } from "./audio-input";
import { TranscriptEditor } from "./transcript-editor";

interface InputPanelProps {
  soapNoteContent: string;
  transcript: string;
  interimTranscript?: string;
  isRecording: boolean;
  isConnecting?: boolean;
  isLoading: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onTranscriptChange: (value: string) => void;
  onGenerateSOAP: () => Promise<void>;
  onCopyToClipboard: (text: string) => Promise<void>;
}

export function InputPanel({
  soapNoteContent,
  transcript,
  interimTranscript,
  isRecording,
  isConnecting,
  isLoading,
  onStartRecording,
  onStopRecording,
  onTranscriptChange,
  onGenerateSOAP,
  onCopyToClipboard,
}: InputPanelProps) {
  return (
    <div
      className={cn(
        "flex size-full flex-col gap-4 transition-all duration-700 ease-in-out lg:flex-1",
        soapNoteContent ? "lg:w-2/5" : "lg:w-3/5"
      )}
    >
      <Header />

      <div className="size-full overflow-y-auto px-4 space-y-6">
        <AudioInput
          isRecording={isRecording}
          isConnecting={isConnecting}
          transcript={transcript}
          interimTranscript={interimTranscript}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
        />

        <TranscriptEditor
          transcript={transcript}
          isLoading={isLoading}
          onTranscriptChange={onTranscriptChange}
          onGenerateSOAP={onGenerateSOAP}
          onCopyToClipboard={onCopyToClipboard}
        />
      </div>
    </div>
  );
}
