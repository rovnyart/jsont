"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Check,
  Table2,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CodeViewer } from "@/components/ui/code-viewer";
import {
  isMappableArray,
  extractFields,
  createInitialMapping,
  applyMapping,
  generateMapCode,
  type FieldMapping,
  type MappingConfig,
} from "@/lib/mapping/array-mapper";

type OutputTab = "json" | "javascript";

interface MapArrayDialogProps {
  data: unknown;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function MapArrayDialog({
  data,
  open: controlledOpen,
  onOpenChange,
}: MapArrayDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const [outputTab, setOutputTab] = useState<OutputTab>("json");
  const [copied, setCopied] = useState(false);
  const [mapping, setMapping] = useState<MappingConfig>({ fields: [] });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Check if data is mappable
  const arrayData = useMemo(() => {
    if (isMappableArray(data)) {
      return data;
    }
    return null;
  }, [data]);

  // Extract fields when dialog opens or data changes
  useEffect(() => {
    if (open && arrayData) {
      const fields = extractFields(arrayData);
      setMapping(createInitialMapping(fields));
      setEditingField(null);
    }
  }, [open, arrayData]);

  // Apply mapping to get result
  const mappedResult = useMemo(() => {
    if (!arrayData || mapping.fields.length === 0) {
      return [];
    }
    return applyMapping(arrayData, mapping);
  }, [arrayData, mapping]);

  // Generate output based on tab
  const output = useMemo(() => {
    if (outputTab === "json") {
      return JSON.stringify(mappedResult, null, 2);
    }
    return generateMapCode(mapping);
  }, [outputTab, mappedResult, mapping]);

  // Toggle field selection
  const handleToggleField = useCallback((source: string) => {
    setMapping((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.source === source ? { ...f, selected: !f.selected } : f
      ),
    }));
  }, []);

  // Start editing field name
  const handleStartEdit = useCallback((field: FieldMapping) => {
    setEditingField(field.source);
    setEditValue(field.target);
  }, []);

  // Save field name edit
  const handleSaveEdit = useCallback(() => {
    if (!editingField || !editValue.trim()) {
      setEditingField(null);
      return;
    }

    setMapping((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.source === editingField ? { ...f, target: editValue.trim() } : f
      ),
    }));
    setEditingField(null);
  }, [editingField, editValue]);

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
  }, []);

  // Handle key press in edit input
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  // Select all / none
  const handleSelectAll = useCallback(() => {
    setMapping((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => ({ ...f, selected: true })),
    }));
  }, []);

  const handleSelectNone = useCallback(() => {
    setMapping((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => ({ ...f, selected: false })),
    }));
  }, []);

  // Reset renames
  const handleResetRenames = useCallback(() => {
    setMapping((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => ({ ...f, target: f.source })),
    }));
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(outputTab === "json" ? "Copied JSON" : "Copied JavaScript");
    } catch {
      toast.error("Failed to copy");
    }
  }, [output, outputTab]);

  // Download
  const handleDownload = useCallback(() => {
    const ext = outputTab === "json" ? ".json" : ".js";
    const mime = outputTab === "json" ? "application/json" : "text/javascript";
    const blob = new Blob([output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapped-data${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }, [output, outputTab]);

  const selectedCount = mapping.fields.filter((f) => f.selected).length;
  const hasRenames = mapping.fields.some((f) => f.source !== f.target);

  if (!arrayData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6"
        style={{ maxWidth: "900px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Table2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Map Array
            <span className="text-muted-foreground font-normal text-xs sm:text-sm">
              ({arrayData.length} items)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 min-h-0 mt-3 sm:mt-4 overflow-hidden">
          {/* Field selector */}
          <div className="h-[180px] sm:h-auto sm:w-64 flex-shrink-0 flex flex-col border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/30">
              <Label className="text-xs sm:text-sm font-medium">Fields</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-6 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectNone}
                  className="h-6 px-2 text-xs"
                >
                  None
                </Button>
                {hasRenames && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetRenames}
                    className="h-6 px-2 text-xs text-muted-foreground hidden sm:inline-flex"
                    title="Reset all renames"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-1">
                {mapping.fields.map((field) => (
                  <div
                    key={field.source}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 group",
                      field.selected && "bg-muted/30"
                    )}
                  >
                    <Checkbox
                      checked={field.selected}
                      onCheckedChange={() => handleToggleField(field.source)}
                      id={`field-${field.source}`}
                    />
                    <div className="flex-1 min-w-0">
                      {editingField === field.source ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleSaveEdit}
                            className="h-6 text-xs py-0"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label
                          htmlFor={`field-${field.source}`}
                          className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm truncate"
                        >
                          <span
                            className={cn(
                              "truncate",
                              !field.selected && "text-muted-foreground"
                            )}
                          >
                            {field.target}
                          </span>
                          {field.source !== field.target && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              ← {field.source}
                            </span>
                          )}
                        </label>
                      )}
                    </div>
                    {editingField !== field.source && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(field)}
                        className="h-6 w-6 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        title="Rename field"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-3 h-8 flex-shrink-0 border-t text-xs text-muted-foreground flex items-center bg-muted/30">
              {selectedCount} of {mapping.fields.length} fields
            </div>
          </div>

          {/* Output preview */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 sm:min-h-[300px]">
            <Tabs
              value={outputTab}
              onValueChange={(v) => setOutputTab(v as OutputTab)}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0 h-9">
                <TabsTrigger value="json" className="text-xs sm:text-sm">JSON</TabsTrigger>
                <TabsTrigger value="javascript" className="text-xs sm:text-sm">JS Code</TabsTrigger>
              </TabsList>

              <TabsContent value="json" className="flex-1 mt-2 min-h-0 data-[state=inactive]:hidden">
                <div className="h-[200px] sm:h-full rounded-lg border overflow-hidden">
                  <CodeViewer
                    value={output}
                    readOnly
                    language="json"
                    className="h-full"
                  />
                </div>
              </TabsContent>

              <TabsContent value="javascript" className="flex-1 mt-2 min-h-0 data-[state=inactive]:hidden">
                <div className="h-[200px] sm:h-full rounded-lg border overflow-hidden">
                  <CodeViewer
                    value={output}
                    readOnly
                    language="javascript"
                    className="h-full"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border flex-shrink-0">
          <div className="text-xs sm:text-sm text-muted-foreground">
            {mappedResult.length} × {selectedCount} fields
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 sm:h-9">
              {copied ? (
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
            </Button>
            <Button size="sm" onClick={handleDownload} className="h-8 sm:h-9">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
