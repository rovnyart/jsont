"use client";

import { useRef } from "react";
import {
  Clipboard,
  Trash2,
  Upload,
  Copy,
  WrapText,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface EditorToolbarProps {
  onClear: () => void;
  onPaste: () => void;
  onLoadFile: (content: string, filename: string) => void;
  onCopy: () => void;
  onFormat: () => void;
  onMinify: () => void;
  hasContent: boolean;
}

export function EditorToolbar({
  onClear,
  onPaste,
  onLoadFile,
  onCopy,
  onFormat,
  onMinify,
  hasContent,
}: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    onLoadFile(text, file.name);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onPaste();
      }
    } catch {
      // Clipboard API might not be available
      onPaste();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Input actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePasteClick}
              className="h-8 px-2"
            >
              <Clipboard className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Paste</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paste from clipboard</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-2"
            >
              <Upload className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Load</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Load from file</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Format actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFormat}
              disabled={!hasContent}
              className="h-8 px-2"
            >
              <WrapText className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Format</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pretty print JSON</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinify}
              disabled={!hasContent}
              className="h-8 px-2"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Minify</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Minify JSON</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Output actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              disabled={!hasContent}
              className="h-8 px-2"
            >
              <Copy className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Copy</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy to clipboard</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Clear */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={!hasContent}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Clear</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear editor</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
