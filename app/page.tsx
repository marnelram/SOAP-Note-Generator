"use client";

import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCompletion } from "@ai-sdk/react";
import { useDeepgramTranscription } from "@/hooks/use-deepgram-transcription";
import { InputPanel, SOAPNoteDisplay } from "@/components/soap-note-generator";

export default function SOAPNoteGenerator() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use Deepgram for transcription
  const {
    isRecording,
    transcript,
    isTranscribing,
    startRecording,
    stopRecording,
    transcribeFile,
    clearTranscript,
    setTranscript,
  } = useDeepgramTranscription();

  // Use the useCompletion hook for streaming SOAP note generation
  const {
    completion: soapNoteContent,
    complete,
    isLoading,
  } = useCompletion({
    api: "/api/completion",
    streamProtocol: "text",
  });

  console.log("soap note: ", soapNoteContent);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith("audio/")) {
      toast({
        title: "Invalid File",
        description: "Please select an audio file.",
        variant: "destructive",
      });
      return;
    }

    try {
      clearTranscript();
      await transcribeFile(file);
      toast({
        title: "Transcription Complete",
        description:
          "Audio file has been transcribed successfully using Deepgram Nova-3-Medical.",
      });
    } catch (error) {
      console.error("File upload error:", error);
    }
  };

  const handleStartRecording = async () => {
    clearTranscript();
    await startRecording();
  };

  const handleGenerateSOAP = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No Transcript",
        description:
          "Please record some audio first before generating a SOAP note.",
        variant: "destructive",
      });
      return;
    }

    try {
      await complete(`${transcript}`);

      toast({
        title: "SOAP Note Generation Started",
        description: "Your SOAP note is being generated...",
      });
    } catch (error) {
      console.error("Error generating SOAP note:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate SOAP note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Content copied to clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const exportSOAP = () => {
    if (!soapNoteContent) return;

    const content = `SOAP NOTE
Generated: ${new Date().toLocaleDateString()}

${soapNoteContent}

---
Original Transcript:
${transcript}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soap-note-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full h-dvh flex-row overflow-hidden bg-white min-h-screen">
      <InputPanel
        soapNoteContent={soapNoteContent}
        transcript={transcript}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        isLoading={isLoading}
        onStartRecording={handleStartRecording}
        onStopRecording={stopRecording}
        onFileUpload={handleFileUpload}
        onTranscriptChange={setTranscript}
        onGenerateSOAP={handleGenerateSOAP}
        onCopyToClipboard={copyToClipboard}
      />

      <SOAPNoteDisplay
        soapNoteContent={soapNoteContent}
        onCopyToClipboard={copyToClipboard}
        onExportSOAP={exportSOAP}
      />
    </div>
  );
}
