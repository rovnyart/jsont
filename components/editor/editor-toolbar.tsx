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
  Menu,
  Binary,
  Sparkles,
  Code,
  TreeDeciduous,
  Table2,
  Send,
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { IndentStyle } from "@/hooks/use-settings";

type ViewMode = "raw" | "tree";

interface EditorToolbarProps {
  // Content actions
  onPaste: () => void;
  onLoadFile: (content: string, filename: string) => void;
  onCopy: () => void;
  onClear: () => void;
  // Transform actions
  onFormat: () => void;
  onMinify: () => void;
  onSort: (recursive: boolean) => void;
  // Dialog triggers
  onOpenTransform: () => void;
  onOpenGenerate: () => void;
  onOpenMapArray: () => void;
  onOpenRequest: () => void;
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  canShowTree: boolean;
  canMapArray: boolean;
  // State
  hasContent: boolean;
  isValidJson: boolean;
  // Settings
  indentStyle: IndentStyle;
  onIndentStyleChange: (style: IndentStyle) => void;
}

const indentLabels: Record<IndentStyle, string> = {
  "2": "2 spaces",
  "4": "4 spaces",
  tab: "Tabs",
};

export function EditorToolbar({
  onPaste,
  onLoadFile,
  onCopy,
  onClear,
  onFormat,
  onMinify,
  onSort,
  onOpenTransform,
  onOpenGenerate,
  onOpenMapArray,
  onOpenRequest,
  viewMode,
  onViewModeChange,
  canShowTree,
  canMapArray,
  hasContent,
  isValidJson,
  indentStyle,
  onIndentStyleChange,
}: EditorToolbarProps) {
  const canTransform = hasContent && isValidJson && viewMode === "raw";
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

  const viewOptions = [
    { value: "raw", label: "Raw", icon: <Code className="h-3.5 w-3.5" /> },
    { value: "tree", label: "Tree", icon: <TreeDeciduous className="h-3.5 w-3.5" />, disabled: !canShowTree },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 p-2 bg-muted/30 border-b border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Primary: Paste */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onPaste}
              className="h-8 px-2"
              aria-label="Paste from clipboard"
            >
              <Clipboard className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Paste</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paste from clipboard</TooltipContent>
        </Tooltip>

        {/* Primary: Format with indent dropdown */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onFormat}
                disabled={!canTransform}
                className="h-8 px-2 rounded-r-none"
                aria-label="Format JSON"
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
                    aria-label="Indent style"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Indent: {indentLabels[indentStyle]}</TooltipContent>
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

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Primary: Copy */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              disabled={!hasContent}
              className="h-8 px-2"
              aria-label="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Copy</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy to clipboard (⌘⇧C)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* View Mode Toggle */}
        <SegmentedControl
          value={viewMode}
          onChange={(v) => onViewModeChange(v as ViewMode)}
          options={viewOptions}
        />

        {/* Desktop-only actions */}
        <Separator orientation="vertical" className="mx-1 h-6 hidden lg:block" />

        {/* Minify - desktop only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinify}
              disabled={!canTransform}
              className="h-8 px-2 hidden lg:flex"
              aria-label="Minify JSON"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="ml-1.5">Minify</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Minify JSON (⌘⇧M)</TooltipContent>
        </Tooltip>

        {/* Sort - desktop only */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canTransform}
                  className="h-8 px-2 hidden lg:flex"
                  aria-label="Sort keys"
                >
                  <ArrowDownAZ className="h-4 w-4" />
                  <span className="ml-1.5">Sort</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Sort object keys</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSort(false)}>
              Top level only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort(true)}>
              Recursive (all levels)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-6 hidden lg:block" />

        {/* Map Array - desktop only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenMapArray}
              disabled={!canMapArray}
              className="h-8 px-2 hidden lg:flex"
              aria-label="Map Array"
            >
              <Table2 className="h-4 w-4" />
              <span className="ml-1.5">Map Array</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Map and transform array fields</TooltipContent>
        </Tooltip>

        {/* Generate - desktop only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenGenerate}
              disabled={!canShowTree}
              className="h-8 px-2 hidden lg:flex"
              aria-label="Generate"
            >
              <Sparkles className="h-4 w-4" />
              <span className="ml-1.5">Generate</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generate TypeScript, Zod, JSON Schema</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={!hasContent}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              aria-label="Clear editor"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear editor</TooltipContent>
        </Tooltip>

        {/* Hamburger Menu - always visible but has different content on mobile vs desktop */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  aria-label="More actions"
                >
                  <Menu className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-48">
            {/* File actions */}
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Load file
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Transform actions - shown on mobile, hidden items for desktop */}
            <DropdownMenuItem onClick={onMinify} disabled={!canTransform} className="lg:hidden">
              <Minimize2 className="h-4 w-4 mr-2" />
              Minify
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canTransform} className="lg:hidden">
                <ArrowDownAZ className="h-4 w-4 mr-2" />
                Sort keys
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onSort(false)}>
                  Top level only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSort(true)}>
                  Recursive (all levels)
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator className="lg:hidden" />

            {/* Tools - some shown on mobile only */}
            <DropdownMenuItem onClick={onOpenMapArray} disabled={!canMapArray} className="lg:hidden">
              <Table2 className="h-4 w-4 mr-2" />
              Map Array
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onOpenGenerate} disabled={!canShowTree} className="lg:hidden">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </DropdownMenuItem>

            {/* These stay in menu for all screen sizes */}
            <DropdownMenuItem onClick={onOpenTransform} disabled={!hasContent}>
              <Binary className="h-4 w-4 mr-2" />
              Transform
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onOpenRequest} disabled={!isValidJson}>
              <Send className="h-4 w-4 mr-2" />
              Request Builder
            </DropdownMenuItem>

            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
