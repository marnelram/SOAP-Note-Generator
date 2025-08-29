import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Copy,
  Download,
  CheckCircle,
  Clock,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MemoizedReactMarkdown, dataComponents } from "@/components/markdown";
import { useState } from "react";

interface SteppedSOAPDisplayProps {
  currentStep: 1 | 2;
  isLoading: boolean;
  bulletPoints: string;
  soapNoteContent: string;
  onCopyToClipboard: (text: string) => Promise<void>;
  onExportSOAP: () => void;
}

export function SteppedSOAPDisplay({
  currentStep,
  isLoading,
  bulletPoints,
  soapNoteContent,
  onCopyToClipboard,
  onExportSOAP,
}: SteppedSOAPDisplayProps) {
  const [isStep1Collapsed, setIsStep1Collapsed] = useState(true);
  const getStepStatus = (step: 1 | 2) => {
    if (step === 1) {
      if (bulletPoints) return "completed";
      if (currentStep === 1 && isLoading) return "loading";
      if (currentStep === 1 && !isLoading) return "current";
      return "pending";
    }

    if (step === 2) {
      if (soapNoteContent) return "completed";
      if (currentStep === 2 && isLoading) return "loading";
      if (bulletPoints && !soapNoteContent) return "current";
      return "pending";
    }

    return "pending";
  };

  const getStepIcon = (step: 1 | 2) => {
    const status = getStepStatus(step);
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "loading":
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case "current":
        return <Circle className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStepBadgeVariant = (step: 1 | 2) => {
    const status = getStepStatus(step);
    switch (status) {
      case "completed":
        return "default";
      case "loading":
      case "current":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!bulletPoints && !soapNoteContent && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No SOAP Note Generated
          </h3>
          <p className="text-gray-500">
            Record audio and generate a SOAP note to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 space-y-6">
      {/* Step Progress Indicator */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          SOAP Note Generation
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStepIcon(1)}
            <Badge variant={getStepBadgeVariant(1)}>
              Step 1: Extract Information
            </Badge>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            {getStepIcon(2)}
            <Badge variant={getStepBadgeVariant(2)}>
              Step 2: Create SOAP Note
            </Badge>
          </div>
        </div>
      </div>

      {/* Step 1: Bullet Points */}
      {bulletPoints && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <button
                onClick={() => setIsStep1Collapsed(!isStep1Collapsed)}
                className="flex items-center space-x-2 hover:opacity-70 transition-opacity"
              >
                {getStepIcon(1)}
                <span>Extracted Information</span>
                {isStep1Collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <Button
                onClick={() => onCopyToClipboard(bulletPoints)}
                variant="outline"
                size="sm"
                className="flex gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Bullet Points
              </Button>
            </CardTitle>
          </CardHeader>
          {!isStep1Collapsed && (
            <CardContent>
              <div className="prose dark:prose-invert prose-headings:mb-4 prose-headings:mt-6 prose-h1:mb-6 prose-h1:mt-8 first:prose-h1:mt-0 prose-p:leading-relaxed prose-ul:my-4 prose-li:my-1 w-full break-words max-w-none">
                <MemoizedReactMarkdown components={dataComponents}>
                  {bulletPoints}
                </MemoizedReactMarkdown>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Step 2: Full SOAP Note */}
      {soapNoteContent ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStepIcon(2)}
                <span>Full SOAP Note</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onCopyToClipboard(soapNoteContent)}
                  variant="outline"
                  size="sm"
                  className="flex gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy SOAP Note
                </Button>
                <Button onClick={onExportSOAP} variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert prose-headings:mb-6 prose-headings:mt-12 prose-h1:mb-8 prose-h1:mt-16 first:prose-h1:mt-0 prose-p:leading-relaxed prose-table:w-full prose-table:table-fixed prose-table:border-collapse prose-table:border prose-th:border prose-th:p-4 prose-th:text-center prose-th:font-semibold prose-td:border prose-td:p-4 w-full break-words max-w-none">
              <MemoizedReactMarkdown components={dataComponents}>
                {soapNoteContent}
              </MemoizedReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : currentStep === 2 && isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
              <span>Creating Full SOAP Note...</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">
                  Converting bullet points to complete SOAP note...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
