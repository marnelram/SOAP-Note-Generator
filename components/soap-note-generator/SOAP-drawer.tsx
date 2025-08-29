/**
 * @fileoverview Case Drawer Component for Mobile Case Editing
 *
 * This file contains the case drawer component that provides a mobile-friendly interface
 * for viewing and editing generated medical training cases in the case generator. It
 * supports different stages of case development with markdown rendering and editing capabilities.
 *
 * @author LeetCare Development Team
 */

import { RefObject } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Loader2, X } from "lucide-react";
import { SteppedSOAPDisplay } from "./stepped-soap-display";

interface CaseDrawerProps {
  /** Reference to the drawer trigger button element */
  drawerRef: RefObject<HTMLButtonElement | null>;

  /** Whether a case is currently being generated */
  isLoading?: boolean;

  currentStep: 1 | 2;
  bulletPoints: string;
  soapNoteContent: string;

  onCopyToClipboard: (text: string) => Promise<void>;
  onExportSOAP: () => void;
}

/**
 * Case Drawer Component
 *
 * Mobile-responsive drawer interface for displaying and editing generated medical training cases.
 * Adapts content based on the current development stage, providing markdown rendering for viewing,
 * rich text editing for modifications, and reasoning component display during generation.
 *
 * @example
 * ```tsx
 * <CaseDrawer
 *   drawerRef={drawerRef}
 *   stage={2}
 *   patientCase={generatedCase}
 *   editorRef={editorRef}
 *   isCreating={false}
 * />
 * ```
 *
 * @see {@link https://ui.shadcn.com/docs/components/drawer} For drawer component documentation
 */
export default function SOAPDrawer({
  isLoading,
  drawerRef,
  currentStep,
  bulletPoints,
  soapNoteContent,
  onCopyToClipboard,
  onExportSOAP,
}: CaseDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger className="w-full pt-4 lg:pt-0 lg:hidden" ref={drawerRef}>
        <div className="flex w-full items-center gap-2 rounded-t-3xl p-6 shadow-[0px_8px_24px_4px_rgba(0,0,0,0.3)]">
          <p className="text-left text-xl font-bold">Generated Note</p>
          {isLoading && (
            <Loader2 className="m-0 h-6 w-6 text-neutral-900 animate-spin" />
          )}
        </div>
      </DrawerTrigger>
      <DrawerPortal>
        <DrawerContent>
          <div className="relative h-[calc(100dvh-6rem)] overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                Generated Note
                {isLoading && (
                  <Loader2 className="m-0 h-6 w-6 text-neutral-900 animate-spin" />
                )}
              </DrawerTitle>
              <DrawerClose>
                <X className="h-8 w-8" />
              </DrawerClose>
            </DrawerHeader>
            <SteppedSOAPDisplay
              currentStep={currentStep}
              isLoading={isLoading}
              bulletPoints={bulletPoints}
              soapNoteContent={soapNoteContent}
              onCopyToClipboard={onCopyToClipboard}
              onExportSOAP={onExportSOAP}
            />
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
