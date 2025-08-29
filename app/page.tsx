"use client";

import { useRef, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCompletion } from "@ai-sdk/react";
import { useDeepgramTranscription } from "@/hooks/use-deepgram-transcription";
import {
  InputPanel,
  SteppedSOAPDisplay,
} from "@/components/soap-note-generator";
import { cn } from "@/lib/utils";
import SOAPDrawer from "@/components/soap-note-generator/SOAP-drawer";

export default function SOAPNoteGeneratorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  /** Reference to the case drawer toggle button for programmatic control */
  const drawerRef = useRef<HTMLButtonElement>(null);

  // State for two-step process
  const [bulletPoints, setBulletPoints] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Use Deepgram for transcription
  const {
    isRecording,
    transcript,
    isTranscribing,
    recordingDuration,
    startRecording,
    stopRecording,
    transcribeFile,
    clearTranscript,
    setTranscript,
  } = useDeepgramTranscription();

  // Step 1: Extract bullet points
  const {
    completion: step1Content,
    complete: completeStep1,
    isLoading: isLoadingStep1,
  } = useCompletion({
    api: "/api/completion/step1",
    streamProtocol: "text",
  });

  // Step 2: Convert to full SOAP note
  const {
    completion: soapNoteContent,
    complete: completeStep2,
    isLoading: isLoadingStep2,
  } = useCompletion({
    api: "/api/completion/step2",
    streamProtocol: "text",
  });

  const isLoading = isLoadingStep1 || isLoadingStep2;

  // Auto-trigger step 2 when step 1 completes
  useEffect(() => {
    const triggerStep2 = async () => {
      if (step1Content && !isLoadingStep1 && currentStep === 1) {
        try {
          setCurrentStep(2);
          setBulletPoints(step1Content);

          toast({
            title: "Step 2: Creating Full SOAP Note",
            description: "Converting bullet points to complete SOAP note...",
          });

          await completeStep2(step1Content);

          toast({
            title: "SOAP Note Complete",
            description: "Your SOAP note has been generated successfully!",
          });
        } catch (error) {
          console.error("Error in step 2:", error);
          toast({
            title: "Step 2 Error",
            description: "Failed to convert bullet points to SOAP note.",
            variant: "destructive",
          });
        }
      }
    };

    triggerStep2();
  }, [step1Content, isLoadingStep1, currentStep, completeStep2, toast]);

  console.log("soap note: ", soapNoteContent);
  console.log("bullet points: ", step1Content);

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
      if (drawerRef.current && window && window.innerWidth < 1024) {
        drawerRef.current.click();
      }

      // Step 1: Extract bullet points
      setCurrentStep(1);
      toast({
        title: "Step 1: Extracting Information",
        description: "Organizing transcript into SOAP bullet points...",
      });

      await completeStep1(`${transcript}`);
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
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        recordingDuration={recordingDuration}
        isLoading={isLoading}
        currentStep={currentStep}
        onStartRecording={handleStartRecording}
        onStopRecording={stopRecording}
        onFileUpload={handleFileUpload}
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
        <SteppedSOAPDisplay
          currentStep={currentStep}
          isLoading={isLoading}
          bulletPoints={step1Content}
          soapNoteContent={soapNoteContent}
          onCopyToClipboard={copyToClipboard}
          onExportSOAP={exportSOAP}
        />
      </div>
      <SOAPDrawer
        drawerRef={drawerRef}
        isLoading={isLoading}
        currentStep={currentStep}
        bulletPoints={step1Content}
        soapNoteContent={soapNoteContent}
        onCopyToClipboard={copyToClipboard}
        onExportSOAP={exportSOAP}
      />
    </div>
  );
}
