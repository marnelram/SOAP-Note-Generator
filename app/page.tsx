"use client";

import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCompletion } from "@ai-sdk/react";
import { useRealtimeTranscription } from "@/hooks/use-realtime-transcription";
import { InputPanel, SOAPNoteDisplay } from "@/components/soap-note-generator";
import { cn } from "@/lib/utils";
import SOAPDrawer from "@/components/soap-note-generator/SOAP-drawer";

export default function SOAPNoteGeneratorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  /** Reference to the case drawer toggle button for programmatic control */
  const drawerRef = useRef<HTMLButtonElement>(null);

  // Use real-time transcription
  const {
    isRecording,
    transcript,
    interimTranscript,
    isConnecting,
    startRecording,
    stopRecording,
    clearTranscript,
    setTranscript,
  } = useRealtimeTranscription();

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

  // Remove file upload functionality for now since we're focusing on real-time

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
      if (drawerRef.current && window && window.innerWidth < 1024) {
        drawerRef.current.click();
      }
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
    <div className="flex flex-col lg:flex-row w-full h-[calc(100dvh-6rem)] lg:h-dvh overflow-hidden min-h-screen">
      <InputPanel
        soapNoteContent={soapNoteContent}
        transcript={transcript}
        interimTranscript={interimTranscript}
        isRecording={isRecording}
        isConnecting={isConnecting}
        isLoading={isLoading}
        onStartRecording={handleStartRecording}
        onStopRecording={stopRecording}
        onTranscriptChange={setTranscript}
        onGenerateSOAP={handleGenerateSOAP}
        onCopyToClipboard={copyToClipboard}
      />
      <div
        className={cn(
          "bg-card z-10 hidden size-full flex-col gap-4 overflow-y-auto p-8 shadow-lg transition-all duration-700 ease-in-out lg:flex",
          soapNoteContent ? "lg:w-3/5" : "lg:w-2/5"
        )}
      >
        <SOAPNoteDisplay
          soapNoteContent={soapNoteContent}
          onCopyToClipboard={copyToClipboard}
          onExportSOAP={exportSOAP}
        />
      </div>
      <SOAPDrawer
        drawerRef={drawerRef}
        isLoading={isLoading}
        soapNoteContent={soapNoteContent}
        onCopyToClipboard={copyToClipboard}
        onExportSOAP={exportSOAP}
      />
    </div>
  );
}
