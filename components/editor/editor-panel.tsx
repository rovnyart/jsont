"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { FileJson, AlertCircle, CheckCircle2, Sparkles, Wand2, Wrench, AlertTriangle } from "lucide-react";
import { JsonEditor, JsonEditorRef } from "./json-editor";
import { EditorToolbar } from "./editor-toolbar";
import { TransformDialog } from "./transform-dialog";
import { JsonTree } from "@/components/tree-view";
import { GenerateDialog } from "@/components/output";
import { MapArrayDialog } from "@/components/mapping";
import { RequestDialog } from "@/components/request";
import { isMappableArray } from "@/lib/mapping/array-mapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getValidationStatus } from "@/lib/editor/json-linter";
import { parseRelaxedJson } from "@/lib/parser/relaxed-json";
import { sortKeys } from "@/lib/json/sort-keys";
import { useSettings, getSettingsFromStorage } from "@/hooks/use-settings";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { repairJson } from "@/lib/repair/json-repair";

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

type StatusType = "idle" | "valid" | "relaxed" | "invalid";
type ViewMode = "raw" | "tree";

// 500KB threshold for large file warning
const LARGE_FILE_THRESHOLD = 500 * 1024;

interface ValidationState {
  status: StatusType;
  message: string | null;
  features: string[];
  errorPosition?: number;
  jsonPath?: string;
}

export function EditorPanel({ value, onChange }: EditorPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
    message: null,
    features: [],
  });
  const [transformOpen, setTransformOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [mapArrayOpen, setMapArrayOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const dragCounter = useRef(0);
  const editorRef = useRef<JsonEditorRef>(null);
  const { settings, updateSetting, getIndent } = useSettings();

  // Parse data for tree view (only for valid JSON, not relaxed)
  const parsedData = useMemo(() => {
    if (validation.status === "valid") {
      const result = parseRelaxedJson(value);
      if (result.success) {
        return result.data;
      }
    }
    return null;
  }, [value, validation.status]);

  // Check if data is a mappable array
  const canMapArray = useMemo(() => {
    return isMappableArray(parsedData);
  }, [parsedData]);

  // Jump to error position in editor
  const handleJumpToError = useCallback(() => {
    if (validation.errorPosition !== undefined && editorRef.current) {
      editorRef.current.scrollToPosition(validation.errorPosition);
    }
  }, [validation.errorPosition]);

  // Validate JSON
  const validateJson = useCallback((content: string) => {
    const result = getValidationStatus(content);
    setValidation({
      status: result.status,
      message: result.message,
      features: result.features,
      errorPosition: result.errorPosition,
      jsonPath: result.jsonPath,
    });
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
    if (result.success && result.data !== null) {
      const indent = getIndent();
      const formatted = JSON.stringify(result.data, null, indent);
      onChange(formatted);
      setValidation({ status: "valid", message: null, features: [] });
      toast.success("Formatted");
    } else {
      toast.error("Cannot format - fix errors first");
    }
  }, [value, onChange, getIndent]);

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

  // Sort object keys
  const handleSort = useCallback(
    (recursive: boolean) => {
      const result = parseRelaxedJson(value);
      if (result.success && result.data !== null) {
        const sorted = sortKeys(result.data, recursive);
        const indent = getIndent();
        const formatted = JSON.stringify(sorted, null, indent);
        onChange(formatted);
        setValidation({ status: "valid", message: null, features: [] });
        toast.success(recursive ? "Sorted all keys recursively" : "Sorted top-level keys");
      } else {
        toast.error("Cannot sort - fix errors first");
      }
    },
    [value, onChange, getIndent]
  );

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

  // Try to repair invalid JSON
  const handleRepair = useCallback(() => {
    const result = repairJson(value);
    if (result.success) {
      // Format the repaired JSON
      try {
        const parsed = JSON.parse(result.repaired);
        const indent = getIndent();
        const formatted = JSON.stringify(parsed, null, indent);
        onChange(formatted);
        setValidation({ status: "valid", message: null, features: [] });
        toast.success("JSON repaired successfully");
      } catch {
        onChange(result.repaired);
        validateJson(result.repaired);
        toast.success("JSON repaired");
      }
    } else {
      toast.error("Could not repair JSON automatically");
    }
  }, [value, onChange, getIndent, validateJson]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    // Switch to raw view when pasting (content might be invalid/relaxed)
    setViewMode("raw");

    try {
      const text = await navigator.clipboard.readText();

      // Auto-format if setting is enabled
      if (settings.formatOnPaste) {
        const result = parseRelaxedJson(text);
        if (result.success && result.data !== null) {
          const indent = getIndent();
          const formatted = JSON.stringify(result.data, null, indent);
          onChange(formatted);
          setValidation({ status: "valid", message: null, features: [] });
          toast.success("Pasted and formatted");
          return;
        }
      }

      onChange(text);
      validateJson(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Cannot access clipboard. Try Ctrl+V instead.");
    }
  }, [onChange, validateJson, settings.formatOnPaste, getIndent]);

  // Load from file
  const handleLoadFile = useCallback(
    (content: string, filename: string) => {
      // Switch to raw view when loading (content might be invalid/relaxed)
      setViewMode("raw");

      // Auto-format if setting is enabled
      if (settings.formatOnPaste) {
        const result = parseRelaxedJson(content);
        if (result.success && result.data !== null) {
          const indent = getIndent();
          const formatted = JSON.stringify(result.data, null, indent);
          onChange(formatted);
          setValidation({ status: "valid", message: null, features: [] });
          toast.success(`Loaded and formatted ${filename}`);
          return;
        }
      }

      onChange(content);
      validateJson(content);
      toast.success(`Loaded ${filename}`);
    },
    [onChange, validateJson, settings.formatOnPaste, getIndent]
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

  // Handle paste in editor (for format on paste)
  const handleEditorPaste = useCallback(
    (text: string): boolean => {
      // Read directly from localStorage - guaranteed fresh value
      const currentSettings = getSettingsFromStorage();

      if (!currentSettings.formatOnPaste) {
        return false; // Let default paste happen
      }

      const result = parseRelaxedJson(text);
      if (result.success && result.data !== null) {
        const indent = getIndent();
        const formatted = JSON.stringify(result.data, null, indent);
        onChange(formatted);
        setValidation({ status: "valid", message: null, features: [] });
        toast.success("Pasted and formatted");
        return true; // We handled it
      }

      return false; // Invalid JSON, let default paste happen
    },
    [onChange, getIndent]
  );

  // Toggle view mode
  const handleToggleView = useCallback(() => {
    setViewMode(prev => prev === "raw" ? "tree" : "raw");
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onFormat: handleFormat,
    onMinify: handleMinify,
    onCopy: handleCopy,
    onClear: handleClear,
    onSort: () => handleSort(true), // recursive sort
    onToggleView: handleToggleView,
  });

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
        onSort={handleSort}
        onOpenTransform={() => setTransformOpen(true)}
        onOpenGenerate={() => setGenerateOpen(true)}
        onOpenMapArray={() => setMapArrayOpen(true)}
        onOpenRequest={() => setRequestOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        canShowTree={!!parsedData}
        canMapArray={canMapArray}
        hasContent={hasContent}
        isValidJson={validation.status === "valid"}
        indentStyle={settings.indentStyle}
        onIndentStyleChange={(style) => updateSetting("indentStyle", style)}
      />

      {/* Dialogs */}
      <TransformDialog
        editorContent={value}
        open={transformOpen}
        onOpenChange={setTransformOpen}
      />
      <GenerateDialog
        data={parsedData}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />
      <MapArrayDialog
        data={parsedData}
        open={mapArrayOpen}
        onOpenChange={setMapArrayOpen}
      />
      <RequestDialog
        body={value}
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />

      {/* Editor or Tree View */}
      <div className="relative flex-1 overflow-hidden">
        {viewMode === "raw" ? (
          <JsonEditor
            ref={editorRef}
            value={value}
            onChange={handleChange}
            onPaste={handleEditorPaste}
            placeholder={`// Paste JSON or drop a file here...
//
// We support relaxed syntax:
{
  unquotedKeys: "allowed",
  'single quotes': 'work too',
  trailing: "commas",  // ← this is fine

  // Comments are welcome!
  /* Block comments too */

  // Even JS-style values:
  debug: true,
  count: 0xFF,
  ref: someVariable.value
}`}
          />
        ) : parsedData ? (
          <JsonTree data={parsedData} className="h-full" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Enter valid JSON to see tree view
          </div>
        )}

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
            <div className="flex items-center gap-2">
              <button
                onClick={handleJumpToError}
                className="flex items-center gap-1.5 text-destructive min-w-0 hover:underline cursor-pointer text-left"
                title="Click to jump to error"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {validation.jsonPath && validation.jsonPath !== "$" && (
                    <span className="text-muted-foreground font-mono mr-1.5">
                      {validation.jsonPath}
                    </span>
                  )}
                  {validation.message}
                </span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRepair}
                className="h-5 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Wrench className="h-3 w-3 mr-1" />
                Try to Fix
              </Button>
            </div>
          )}
          {validation.status === "idle" && (
            <span className="text-muted-foreground">Ready</span>
          )}
        </div>
        <div className="text-muted-foreground flex-shrink-0 flex items-center gap-2">
          {hasContent && value.length > LARGE_FILE_THRESHOLD && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-help">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Large file</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Large files (&gt;500KB) may cause slower editor performance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
