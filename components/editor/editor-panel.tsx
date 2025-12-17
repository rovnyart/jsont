"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { JsonEditor } from "./json-editor";
import { EditorToolbar } from "./editor-toolbar";
import { cn } from "@/lib/utils";
import { getErrorSummary } from "@/lib/editor/json-linter";

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

type ValidationStatus = "idle" | "valid" | "invalid";

export function EditorPanel({ value, onChange }: EditorPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Validate JSON
  const validateJson = useCallback((content: string) => {
    if (!content.trim()) {
      setValidationStatus("idle");
      setErrorMessage(null);
      return;
    }

    const error = getErrorSummary(content);
    if (error) {
      setValidationStatus("invalid");
      setErrorMessage(error);
    } else {
      setValidationStatus("valid");
      setErrorMessage(null);
    }
  }, []);

  // Validate when value changes (including initial load from localStorage)
  const hasValidatedInitial = useRef(false);
  useEffect(() => {
    // Only auto-validate once when content first appears (e.g., from localStorage)
    // After that, validation happens through handleChange
    if (!hasValidatedInitial.current && value.trim()) {
      hasValidatedInitial.current = true;
      validateJson(value);
    }
    // Reset flag if content is cleared
    if (!value.trim()) {
      hasValidatedInitial.current = false;
    }
  }, [value, validateJson]);

  // Handle content change
  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      validateJson(newValue);
    },
    [onChange, validateJson]
  );

  // Format JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      setValidationStatus("valid");
      setErrorMessage(null);
      toast.success("Formatted");
    } catch {
      toast.error("Cannot format invalid JSON");
    }
  }, [value, onChange]);

  // Minify JSON
  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(value);
      const minified = JSON.stringify(parsed);
      onChange(minified);
      toast.success("Minified");
    } catch {
      toast.error("Cannot minify invalid JSON");
    }
  }, [value, onChange]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [value]);

  // Clear editor
  const handleClear = useCallback(() => {
    onChange("");
    setValidationStatus("idle");
    setErrorMessage(null);
    toast.success("Cleared");
  }, [onChange]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
      validateJson(text);
      toast.success("Pasted from clipboard");
    } catch {
      // Browser might block clipboard access
      toast.error("Cannot access clipboard. Try Ctrl+V instead.");
    }
  }, [onChange, validateJson]);

  // Load from file
  const handleLoadFile = useCallback(
    (content: string, filename: string) => {
      onChange(content);
      validateJson(content);
      toast.success(`Loaded ${filename}`);
    },
    [onChange, validateJson]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const file = e.dataTransfer.files[0];
      if (file) {
        const text = await file.text();
        handleLoadFile(text, file.name);
      }
    },
    [handleLoadFile]
  );

  const hasContent = value.trim().length > 0;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-lg border border-border bg-background transition-colors",
        isDragging && "border-primary border-2 border-dashed"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <EditorToolbar
        onClear={handleClear}
        onPaste={handlePaste}
        onLoadFile={handleLoadFile}
        onCopy={handleCopy}
        onFormat={handleFormat}
        onMinify={handleMinify}
        hasContent={hasContent}
      />

      {/* Editor */}
      <div className="relative flex-1 overflow-hidden">
        <JsonEditor
          value={value}
          onChange={handleChange}
          placeholder="Paste your JSON here, or drop a file..."
        />

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <FileJson className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium">Drop your file here</p>
              <p className="text-sm text-muted-foreground">
                JSON or text files supported
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between gap-4 border-t border-border px-3 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {validationStatus === "valid" && (
            <div className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Valid JSON</span>
            </div>
          )}
          {validationStatus === "invalid" && (
            <div className="flex items-center gap-1.5 text-destructive min-w-0">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate" title={errorMessage || undefined}>
                {errorMessage}
              </span>
            </div>
          )}
          {validationStatus === "idle" && (
            <span className="text-muted-foreground">Ready</span>
          )}
        </div>
        <div className="text-muted-foreground flex-shrink-0">
          {hasContent && (
            <span>
              {value.length.toLocaleString()} chars
              {validationStatus === "valid" && (
                <span className="ml-2">
                  {(() => {
                    try {
                      const parsed = JSON.parse(value);
                      if (Array.isArray(parsed))
                        return `• ${parsed.length} items`;
                      if (typeof parsed === "object" && parsed !== null)
                        return `• ${Object.keys(parsed).length} keys`;
                      return "";
                    } catch {
                      return "";
                    }
                  })()}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
