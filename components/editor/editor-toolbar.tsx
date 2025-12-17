"use client";

import { useRef } from "react";
import {
  Clipboard,
  Trash2,
  Upload,
  Copy,
  WrapText,
  Minimize2,
  ChevronDown,
  ArrowDownAZ,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { IndentStyle } from "@/hooks/use-settings";

interface EditorToolbarProps {
  onClear: () => void;
  onPaste: () => void;
  onLoadFile: (content: string, filename: string) => void;
  onCopy: () => void;
  onFormat: () => void;
  onMinify: () => void;
  onSort: (recursive: boolean) => void;
  hasContent: boolean;
  isValidJson: boolean;
  indentStyle: IndentStyle;
  onIndentStyleChange: (style: IndentStyle) => void;
}

const indentLabels: Record<IndentStyle, string> = {
  "2": "2 spaces",
  "4": "4 spaces",
  tab: "Tabs",
};

export function EditorToolbar({
  onClear,
  onPaste,
  onLoadFile,
  onCopy,
  onFormat,
  onMinify,
  onSort,
  hasContent,
  isValidJson,
  indentStyle,
  onIndentStyleChange,
}: EditorToolbarProps) {
  // Format/Minify/Sort require valid JSON (not relaxed/JS-style)
  const canTransform = hasContent && isValidJson;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    onLoadFile(text, file.name);

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
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onFormat}
                disabled={!canTransform}
                className="h-8 px-2 rounded-r-none"
              >
                <WrapText className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Format</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pretty print JSON (⌘↵)</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-1.5 rounded-l-none border-l border-border/50"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Indent style: {indentLabels[indentStyle]}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onIndentStyleChange("2")}
                className={indentStyle === "2" ? "bg-accent" : ""}
              >
                2 spaces
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onIndentStyleChange("4")}
                className={indentStyle === "4" ? "bg-accent" : ""}
              >
                4 spaces
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onIndentStyleChange("tab")}
                className={indentStyle === "tab" ? "bg-accent" : ""}
              >
                Tabs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinify}
              disabled={!canTransform}
              className="h-8 px-2"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Minify</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Minify JSON (⌘⇧M)</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canTransform}
                  className="h-8 px-2"
                >
                  <ArrowDownAZ className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Sort</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Sort object keys (⌘⇧S)</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSort(false)}>
              Sort keys (top level)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort(true)}>
              Sort keys (recursive)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
          <TooltipContent>Copy to clipboard (⌘⇧C)</TooltipContent>
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
          <TooltipContent>Clear editor (⌘⇧X)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
