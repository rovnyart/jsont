"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Clipboard,
  Copy,
  Plus,
  Minus,
  PenLine,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DiffCodeViewer, type DiffCodeViewerRef } from "./diff-code-viewer";
import { cn } from "@/lib/utils";
import {
  compareJson,
  generateDiffReport,
  formatValue,
  findPathPosition,
  type DiffResult,
  type DiffSummary,
} from "@/lib/diff";
import { parseRelaxedJson } from "@/lib/parser/relaxed-json";

interface CompareDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialValue?: string;
}

export function CompareDialog({
  open: controlledOpen,
  onOpenChange,
  initialValue = "",
}: CompareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const [leftValue, setLeftValue] = useState("");
  const [rightValue, setRightValue] = useState("");
  const [ignoreArrayOrder, setIgnoreArrayOrder] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);

  // Refs for editors
  const leftEditorRef = useRef<DiffCodeViewerRef>(null);
  const rightEditorRef = useRef<DiffCodeViewerRef>(null);

  // Handle open state changes
  if (open && !wasOpen) {
    setWasOpen(true);
    if (initialValue) {
      setLeftValue(initialValue);
    }
  } else if (!open && wasOpen) {
    setWasOpen(false);
    setLeftValue("");
    setRightValue("");
    setCopied(false);
    setSelectedDiffIndex(null);
  }

  // Parse JSON values
  const leftParsed = useMemo(() => {
    if (!leftValue.trim()) return { success: false, data: null, error: "Empty" };
    const result = parseRelaxedJson(leftValue);
    return result;
  }, [leftValue]);

  const rightParsed = useMemo(() => {
    if (!rightValue.trim()) return { success: false, data: null, error: "Empty" };
    const result = parseRelaxedJson(rightValue);
    return result;
  }, [rightValue]);

  // Calculate diff
  const diffSummary = useMemo<DiffSummary | null>(() => {
    if (!leftParsed.success || !rightParsed.success) return null;
    return compareJson(leftParsed.data, rightParsed.data, { ignoreArrayOrder });
  }, [leftParsed, rightParsed, ignoreArrayOrder]);

  // Handle diff item click - scroll and highlight
  const handleDiffClick = useCallback((diff: DiffResult, index: number) => {
    setSelectedDiffIndex(index);

    // Find position in left editor (for removed and modified)
    if (diff.type === "removed" || diff.type === "modified") {
      const leftPos = findPathPosition(leftValue, diff.path);
      if (leftPos) {
        leftEditorRef.current?.scrollToLine(leftPos.line);
        leftEditorRef.current?.highlightLine(leftPos.line);
      }
    } else {
      leftEditorRef.current?.highlightLine(null);
    }

    // Find position in right editor (for added and modified)
    if (diff.type === "added" || diff.type === "modified") {
      const rightPos = findPathPosition(rightValue, diff.path);
      if (rightPos) {
        rightEditorRef.current?.scrollToLine(rightPos.line);
        rightEditorRef.current?.highlightLine(rightPos.line);
      }
    } else {
      rightEditorRef.current?.highlightLine(null);
    }
  }, [leftValue, rightValue]);

  // Swap left and right
  const handleSwap = useCallback(() => {
    const tempLeft = leftValue;
    setLeftValue(rightValue);
    setRightValue(tempLeft);
    setSelectedDiffIndex(null);
    leftEditorRef.current?.highlightLine(null);
    rightEditorRef.current?.highlightLine(null);
  }, [leftValue, rightValue]);

  // Paste from clipboard
  const handlePasteLeft = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLeftValue(text);
      setSelectedDiffIndex(null);
      leftEditorRef.current?.highlightLine(null);
      toast.success("Pasted to left pane");
    } catch {
      toast.error("Cannot access clipboard");
    }
  }, []);

  const handlePasteRight = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRightValue(text);
      setSelectedDiffIndex(null);
      rightEditorRef.current?.highlightLine(null);
      toast.success("Pasted to right pane");
    } catch {
      toast.error("Cannot access clipboard");
    }
  }, []);

  // Clear panes
  const handleClearLeft = useCallback(() => {
    setLeftValue("");
    setSelectedDiffIndex(null);
    leftEditorRef.current?.highlightLine(null);
  }, []);

  const handleClearRight = useCallback(() => {
    setRightValue("");
    setSelectedDiffIndex(null);
    rightEditorRef.current?.highlightLine(null);
  }, []);

  // Copy diff report
  const handleCopyReport = useCallback(async () => {
    if (!diffSummary) return;
    try {
      const report = generateDiffReport(diffSummary);
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Diff report copied");
    } catch {
      toast.error("Failed to copy");
    }
  }, [diffSummary]);

  const hasDifferences = diffSummary && diffSummary.differences.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[95vw] max-w-6xl max-h-[90vh] flex flex-col p-4 sm:p-6"
        style={{ maxWidth: "1200px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            Compare JSON
          </DialogTitle>
        </DialogHeader>

        {/* Editor Panes */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 mt-4">
          {/* Left Pane */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Original</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePasteLeft}
                  className="h-7 px-2 text-xs"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  Paste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearLeft}
                  disabled={!leftValue}
                  className="h-7 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className={cn(
              "flex-1 min-h-[200px] lg:min-h-[250px] rounded-lg border overflow-hidden",
              !leftParsed.success && leftValue.trim() ? "border-destructive" : "border-border"
            )}>
              <DiffCodeViewer
                ref={leftEditorRef}
                value={leftValue}
                onChange={setLeftValue}
                readOnly={false}
                className="h-full"
              />
            </div>
            {!leftParsed.success && leftValue.trim() && (
              <p className="text-xs text-destructive mt-1">Invalid JSON</p>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex lg:flex-col items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwap}
              className="h-8 w-8 p-0"
              title="Swap left and right"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Right Pane */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Compare with</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePasteRight}
                  className="h-7 px-2 text-xs"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  Paste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRight}
                  disabled={!rightValue}
                  className="h-7 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className={cn(
              "flex-1 min-h-[200px] lg:min-h-[250px] rounded-lg border overflow-hidden",
              !rightParsed.success && rightValue.trim() ? "border-destructive" : "border-border"
            )}>
              <DiffCodeViewer
                ref={rightEditorRef}
                value={rightValue}
                onChange={setRightValue}
                readOnly={false}
                className="h-full"
              />
            </div>
            {!rightParsed.success && rightValue.trim() && (
              <p className="text-xs text-destructive mt-1">Invalid JSON</p>
            )}
          </div>
        </div>

        {/* Diff Results */}
        <div className="mt-4 flex flex-col gap-3">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm font-medium">
              {diffSummary ? (
                diffSummary.differences.length === 0 ? (
                  <span className="text-emerald-500">No differences — JSONs are identical</span>
                ) : (
                  <span>
                    {diffSummary.differences.length} difference{diffSummary.differences.length !== 1 ? "s" : ""}
                    <span className="text-muted-foreground ml-2 font-normal text-xs">
                      ({diffSummary.added} added, {diffSummary.removed} removed, {diffSummary.modified} modified)
                    </span>
                    <span className="text-muted-foreground ml-2 font-normal text-xs">
                      — click to jump
                    </span>
                  </span>
                )
              ) : (
                <span className="text-muted-foreground font-normal">
                  {!leftValue.trim() && !rightValue.trim()
                    ? "Paste JSON in both panes to compare"
                    : "Enter valid JSON in both panes"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Checkbox
                id="ignoreOrder"
                checked={ignoreArrayOrder}
                onCheckedChange={(checked) => setIgnoreArrayOrder(!!checked)}
              />
              <Label htmlFor="ignoreOrder" className="text-xs cursor-pointer whitespace-nowrap">
                Ignore array order
              </Label>
            </div>
          </div>

          {/* Diff List */}
          <ScrollArea className="h-[120px] rounded-lg border border-border bg-muted/30">
            {diffSummary && diffSummary.differences.length > 0 ? (
              <div className="p-2 space-y-1">
                {diffSummary.differences.map((diff, index) => (
                  <DiffItem
                    key={index}
                    diff={diff}
                    isSelected={selectedDiffIndex === index}
                    onClick={() => handleDiffClick(diff, index)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
                {diffSummary
                  ? "Both JSONs have the same structure and values"
                  : "Differences will appear here"}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyReport}
            disabled={!hasDifferences}
            className="h-8 sm:h-9"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy Report"}
          </Button>
          <Button size="sm" onClick={() => setOpen(false)} className="h-8 sm:h-9">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DiffItemProps {
  diff: DiffResult;
  isSelected: boolean;
  onClick: () => void;
}

function DiffItem({ diff, isSelected, onClick }: DiffItemProps) {
  const icon =
    diff.type === "added" ? (
      <Plus className="h-3 w-3 text-emerald-500" />
    ) : diff.type === "removed" ? (
      <Minus className="h-3 w-3 text-destructive" />
    ) : (
      <PenLine className="h-3 w-3 text-amber-500" />
    );

  const bgColor =
    diff.type === "added"
      ? "bg-emerald-500/10 hover:bg-emerald-500/20"
      : diff.type === "removed"
      ? "bg-destructive/10 hover:bg-destructive/20"
      : "bg-amber-500/10 hover:bg-amber-500/20";

  const selectedRing =
    diff.type === "added"
      ? "ring-2 ring-emerald-500/50"
      : diff.type === "removed"
      ? "ring-2 ring-destructive/50"
      : "ring-2 ring-amber-500/50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 px-2 py-1.5 rounded text-xs font-mono transition-all w-full text-left",
        bgColor,
        isSelected && selectedRing,
        "cursor-pointer"
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span className="font-semibold text-foreground">{diff.path}</span>
      <span className="text-muted-foreground flex-1 truncate">
        {diff.type === "added" && (
          <>added: <span className="text-emerald-500">{formatValue(diff.newValue)}</span></>
        )}
        {diff.type === "removed" && (
          <>removed (was: <span className="text-destructive">{formatValue(diff.oldValue)}</span>)</>
        )}
        {diff.type === "modified" && (
          <>
            <span className="text-destructive">{formatValue(diff.oldValue)}</span>
            {" → "}
            <span className="text-emerald-500">{formatValue(diff.newValue)}</span>
          </>
        )}
      </span>
    </button>
  );
}
