"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { FileJson, AlertCircle, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { JsonEditor } from "./json-editor";
import { EditorToolbar } from "./editor-toolbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getValidationStatus } from "@/lib/editor/json-linter";
import { parseRelaxedJson } from "@/lib/parser/relaxed-json";

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

type StatusType = "idle" | "valid" | "relaxed" | "invalid";

interface ValidationState {
  status: StatusType;
  message: string | null;
  features: string[];
}

export function EditorPanel({ value, onChange }: EditorPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
    message: null,
    features: [],
  });
  const dragCounter = useRef(0);

  // Validate JSON
  const validateJson = useCallback((content: string) => {
    const result = getValidationStatus(content);
    setValidation(result);
  }, []);

  // Validate when value changes (including initial load from localStorage)
  const hasValidatedInitial = useRef(false);
  useEffect(() => {
    if (!hasValidatedInitial.current && value.trim()) {
      hasValidatedInitial.current = true;
      validateJson(value);
    }
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

  // Convert relaxed JSON to strict JSON
  const handleConvertToJson = useCallback(() => {
    const result = parseRelaxedJson(value);
    if (result.success && result.normalized) {
      onChange(result.normalized);
      setValidation({ status: "valid", message: null, features: [] });
      toast.success("Converted to valid JSON");
    } else {
      toast.error("Cannot convert - fix errors first");
    }
  }, [value, onChange]);

  // Format JSON (works with both strict and relaxed)
  const handleFormat = useCallback(() => {
    const result = parseRelaxedJson(value);
    if (result.success && result.normalized) {
      onChange(result.normalized);
      setValidation({ status: "valid", message: null, features: [] });
      toast.success("Formatted");
    } else {
      toast.error("Cannot format - fix errors first");
    }
  }, [value, onChange]);

  // Minify JSON (works with both strict and relaxed)
  const handleMinify = useCallback(() => {
    const result = parseRelaxedJson(value);
    if (result.success && result.data !== null) {
      const minified = JSON.stringify(result.data);
      onChange(minified);
      setValidation({ status: "valid", message: null, features: [] });
      toast.success("Minified");
    } else {
      toast.error("Cannot minify - fix errors first");
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
    setValidation({ status: "idle", message: null, features: [] });
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

  // Get stats for valid content
  const getStats = () => {
    if (validation.status === "valid" || validation.status === "relaxed") {
      const result = parseRelaxedJson(value);
      if (result.success && result.data !== null) {
        if (Array.isArray(result.data)) {
          return `• ${result.data.length} items`;
        }
        if (typeof result.data === "object") {
          return `• ${Object.keys(result.data).length} keys`;
        }
      }
    }
    return "";
  };

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
          {validation.status === "valid" && (
            <div className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Valid JSON</span>
            </div>
          )}
          {validation.status === "relaxed" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-amber-500">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  JS-style JSON
                  {validation.features.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({validation.features.join(", ")})
                    </span>
                  )}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConvertToJson}
                className="h-5 px-2 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Convert to JSON
              </Button>
            </div>
          )}
          {validation.status === "invalid" && (
            <div className="flex items-center gap-1.5 text-destructive min-w-0">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate" title={validation.message || undefined}>
                {validation.message}
              </span>
            </div>
          )}
          {validation.status === "idle" && (
            <span className="text-muted-foreground">Ready</span>
          )}
        </div>
        <div className="text-muted-foreground flex-shrink-0">
          {hasContent && (
            <span>
              {value.length.toLocaleString()} chars
              <span className="ml-2">{getStats()}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
