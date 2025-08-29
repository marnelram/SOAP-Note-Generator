import { cn } from "@/lib/utils";
import { Header } from "./header";
import { AudioInput } from "./audio-input";
import { TranscriptEditor } from "./transcript-editor";

interface InputPanelProps {
  soapNoteContent: string;
  transcript: string;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration?: number;
  isLoading: boolean;
  currentStep?: 1 | 2;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onTranscriptChange: (value: string) => void;
  onGenerateSOAP: () => Promise<void>;
  onCopyToClipboard: (text: string) => Promise<void>;
}

export function InputPanel({
  soapNoteContent,
  transcript,
  isRecording,
  isTranscribing,
  recordingDuration,
  isLoading,
  currentStep,
  onStartRecording,
  onStopRecording,
  onFileUpload,
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
          isTranscribing={isTranscribing}
          recordingDuration={recordingDuration}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onFileUpload={onFileUpload}
        />

        <TranscriptEditor
          transcript={transcript}
          isLoading={isLoading}
          currentStep={currentStep}
          onTranscriptChange={onTranscriptChange}
          onGenerateSOAP={onGenerateSOAP}
          onCopyToClipboard={onCopyToClipboard}
        />
      </div>
    </div>
  );
}
