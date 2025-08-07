import { Button } from "@/components/ui/button";
import { FileText, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemoizedReactMarkdown, dataComponents } from "@/components/markdown";

interface SOAPNoteDisplayProps {
  soapNoteContent: string;
  onCopyToClipboard: (text: string) => Promise<void>;
  onExportSOAP: () => void;
}

export function SOAPNoteDisplay({
  soapNoteContent,
  onCopyToClipboard,
  onExportSOAP,
}: SOAPNoteDisplayProps) {
  console.log("soap note: ", soapNoteContent);

  return (
    <div
      className={cn(
        "z-10 hidden size-full flex-col gap-4 overflow-y-auto p-8 shadow-lg transition-all duration-700 ease-in-out lg:flex",
        soapNoteContent ? "lg:w-3/5" : "bg-blue-50 lg:w-2/5"
      )}
    >
      {soapNoteContent ? (
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Generated SOAP Note
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => onCopyToClipboard(soapNoteContent)}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button onClick={onExportSOAP} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="prose dark:prose-invert prose-headings:mb-6 prose-headings:mt-12 prose-h1:mb-8 prose-h1:mt-16 first:prose-h1:mt-0 prose-p:leading-relaxed prose-table:w-full prose-table:table-fixed prose-table:border-collapse prose-table:border prose-th:border prose-th:p-4 prose-th:text-center prose-th:font-semibold prose-td:border prose-td:p-4 w-full break-words">
            <MemoizedReactMarkdown components={dataComponents}>
              {soapNoteContent}
            </MemoizedReactMarkdown>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
