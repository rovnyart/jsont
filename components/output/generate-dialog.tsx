"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  FileJson,
  Braces,
  Shield,
  Check,
  Sparkles,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  generateJsonSchema,
  defaultSchemaOptions,
  type JsonSchemaOptions,
} from "@/lib/generators/json-schema";
import {
  generateTypeScript,
  defaultTypeScriptOptions,
  type TypeScriptOptions,
} from "@/lib/generators/typescript";
import {
  generateZod,
  defaultZodOptions,
  type ZodOptions,
} from "@/lib/generators/zod";

type GeneratorType = "json-schema" | "typescript" | "zod";

interface GenerateDialogProps {
  data: unknown;
  /** Controlled open state (optional - if not provided, uses internal state) */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function GenerateDialog({ data, open: controlledOpen, onOpenChange }: GenerateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [generator, setGenerator] = useState<GeneratorType>("json-schema");
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedOutput, setEditedOutput] = useState<string | null>(null);
  const [schemaOptions, setSchemaOptions] = useState<JsonSchemaOptions>({
    ...defaultSchemaOptions,
    title: "",
    description: "",
  });
  const [tsOptions, setTsOptions] = useState<TypeScriptOptions>({
    ...defaultTypeScriptOptions,
  });
  const [zodOptions, setZodOptions] = useState<ZodOptions>({
    ...defaultZodOptions,
  });

  // Generate output based on selected generator
  const generatedOutput = useMemo(() => {
    if (data === null || data === undefined) {
      return null;
    }

    try {
      switch (generator) {
        case "json-schema":
          return generateJsonSchema(data, {
            ...schemaOptions,
            title: schemaOptions.title || undefined,
            description: schemaOptions.description || undefined,
          });
        case "typescript":
          return generateTypeScript(data, {
            ...tsOptions,
            rootName: tsOptions.rootName || "Root",
          });
        case "zod":
          return generateZod(data, zodOptions);
        default:
          return null;
      }
    } catch (error) {
      return `// Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }, [data, generator, schemaOptions, tsOptions, zodOptions]);

  // Reset edit mode when switching tabs
  useEffect(() => {
    setEditMode(false);
    setEditedOutput(null);
  }, [generator]);

  const output = editMode && editedOutput !== null ? editedOutput : generatedOutput;

  // Handle edit mode toggle
  const handleEditModeChange = useCallback((enabled: boolean) => {
    setEditMode(enabled);
    if (enabled) {
      setEditedOutput(generatedOutput);
    } else {
      setEditedOutput(null);
    }
  }, [generatedOutput]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [output]);

  // Download file
  const handleDownload = useCallback(() => {
    if (!output) return;

    const config: Record<GeneratorType, { ext: string; mime: string; name: string }> = {
      "json-schema": { ext: ".schema.json", mime: "application/json", name: "schema" },
      "typescript": { ext: ".d.ts", mime: "text/typescript", name: "types" },
      "zod": { ext: ".zod.ts", mime: "text/typescript", name: "schema" },
    };

    const { ext, mime, name } = config[generator];
    const blob = new Blob([output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schemaOptions.title || name}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }, [output, generator, schemaOptions.title]);

  const hasData = data !== null && data !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6"
        style={{ maxWidth: "900px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            Generate Schema / Types
          </DialogTitle>
        </DialogHeader>

        <Tabs value={generator} onValueChange={(v) => setGenerator(v as GeneratorType)} className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="json-schema" className="gap-1.5 text-xs sm:text-sm">
              <FileJson className="h-3.5 w-3.5 hidden sm:block" />
              <span className="sm:hidden">Schema</span>
              <span className="hidden sm:inline">JSON Schema</span>
            </TabsTrigger>
            <TabsTrigger value="typescript" className="gap-1.5 text-xs sm:text-sm">
              <Braces className="h-3.5 w-3.5 hidden sm:block" />
              <span className="sm:hidden">TS</span>
              <span className="hidden sm:inline">TypeScript</span>
            </TabsTrigger>
            <TabsTrigger value="zod" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5 hidden sm:block" />
              Zod
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json-schema" className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
            {/* Options */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="allRequired"
                  checked={schemaOptions.allRequired}
                  onCheckedChange={(checked) =>
                    setSchemaOptions(prev => ({ ...prev, allRequired: checked }))
                  }
                />
                <Label htmlFor="allRequired" className="text-xs sm:text-sm cursor-pointer">
                  Required
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="strictMode"
                  checked={schemaOptions.strictMode}
                  onCheckedChange={(checked) =>
                    setSchemaOptions(prev => ({ ...prev, strictMode: checked }))
                  }
                />
                <Label htmlFor="strictMode" className="text-xs sm:text-sm cursor-pointer">
                  Strict
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="includeExamples"
                  checked={schemaOptions.includeExamples}
                  onCheckedChange={(checked) =>
                    setSchemaOptions(prev => ({ ...prev, includeExamples: checked }))
                  }
                />
                <Label htmlFor="includeExamples" className="text-xs sm:text-sm cursor-pointer">
                  Examples
                </Label>
              </div>

              <Input
                value={schemaOptions.title || ""}
                onChange={(e) =>
                  setSchemaOptions(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder="Title"
                className="h-8 text-xs sm:text-sm"
              />
            </div>

            {/* Edit mode toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="editMode"
                  checked={editMode}
                  onCheckedChange={handleEditModeChange}
                />
                <Label htmlFor="editMode" className="text-xs sm:text-sm cursor-pointer flex items-center gap-1.5">
                  <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Edit
                </Label>
              </div>
              {editMode && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Manual edits not validated</span>
                </div>
              )}
            </div>

            {/* Output */}
            <div className={cn(
              "h-[250px] sm:h-[340px] rounded-lg border overflow-hidden",
              editMode ? "border-amber-500/50" : "border-border"
            )}>
              {hasData && output ? (
                <CodeViewer
                  value={output}
                  onChange={editMode ? setEditedOutput : undefined}
                  readOnly={!editMode}
                  language="json"
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30 text-sm">
                  Enter valid JSON to generate schema
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="typescript" className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
            {/* TypeScript Options */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="tsStyle"
                  checked={tsOptions.style === "type"}
                  onCheckedChange={(checked) =>
                    setTsOptions(prev => ({ ...prev, style: checked ? "type" : "interface" }))
                  }
                />
                <Label htmlFor="tsStyle" className="text-xs sm:text-sm cursor-pointer">
                  {tsOptions.style === "type" ? "Type" : "Interface"}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="tsExport"
                  checked={tsOptions.exportTypes}
                  onCheckedChange={(checked) =>
                    setTsOptions(prev => ({ ...prev, exportTypes: checked }))
                  }
                />
                <Label htmlFor="tsExport" className="text-xs sm:text-sm cursor-pointer">
                  Export
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="tsOptional"
                  checked={tsOptions.allOptional}
                  onCheckedChange={(checked) =>
                    setTsOptions(prev => ({ ...prev, allOptional: checked }))
                  }
                />
                <Label htmlFor="tsOptional" className="text-xs sm:text-sm cursor-pointer">
                  Optional
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="tsReadonly"
                  checked={tsOptions.readonlyProps}
                  onCheckedChange={(checked) =>
                    setTsOptions(prev => ({ ...prev, readonlyProps: checked }))
                  }
                />
                <Label htmlFor="tsReadonly" className="text-xs sm:text-sm cursor-pointer">
                  Readonly
                </Label>
              </div>

              <Input
                value={tsOptions.rootName}
                onChange={(e) =>
                  setTsOptions(prev => ({ ...prev, rootName: e.target.value }))
                }
                placeholder="Root"
                className="h-8 text-xs sm:text-sm col-span-2 sm:col-span-1"
              />
            </div>

            {/* Edit mode toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="editModeTs"
                  checked={editMode}
                  onCheckedChange={handleEditModeChange}
                />
                <Label htmlFor="editModeTs" className="text-xs sm:text-sm cursor-pointer flex items-center gap-1.5">
                  <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Edit
                </Label>
              </div>
              {editMode && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Manual edits not validated</span>
                </div>
              )}
            </div>

            {/* Output */}
            <div className={cn(
              "h-[250px] sm:h-[280px] rounded-lg border overflow-hidden",
              editMode ? "border-amber-500/50" : "border-border"
            )}>
              {hasData && output ? (
                <CodeViewer
                  value={output}
                  onChange={editMode ? setEditedOutput : undefined}
                  readOnly={!editMode}
                  language="typescript"
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30 text-sm">
                  Enter valid JSON to generate TypeScript
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="zod" className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
            {/* Zod Options */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="zodNullable"
                  checked={zodOptions.useNullable}
                  onCheckedChange={(checked) =>
                    setZodOptions(prev => ({ ...prev, useNullable: checked }))
                  }
                />
                <Label htmlFor="zodNullable" className="text-xs sm:text-sm cursor-pointer">
                  Nullable
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="zodStrict"
                  checked={zodOptions.strictMode}
                  onCheckedChange={(checked) =>
                    setZodOptions(prev => ({ ...prev, strictMode: checked }))
                  }
                />
                <Label htmlFor="zodStrict" className="text-xs sm:text-sm cursor-pointer">
                  Strict
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="zodDates"
                  checked={zodOptions.detectDates}
                  onCheckedChange={(checked) =>
                    setZodOptions(prev => ({ ...prev, detectDates: checked }))
                  }
                />
                <Label htmlFor="zodDates" className="text-xs sm:text-sm cursor-pointer">
                  Dates
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="zodEnums"
                  checked={zodOptions.detectEnums}
                  onCheckedChange={(checked) =>
                    setZodOptions(prev => ({ ...prev, detectEnums: checked }))
                  }
                />
                <Label htmlFor="zodEnums" className="text-xs sm:text-sm cursor-pointer">
                  Enums
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="zodDescriptions"
                  checked={zodOptions.addDescriptions}
                  onCheckedChange={(checked) =>
                    setZodOptions(prev => ({ ...prev, addDescriptions: checked }))
                  }
                />
                <Label htmlFor="zodDescriptions" className="text-xs sm:text-sm cursor-pointer">
                  Describe
                </Label>
              </div>
            </div>

            {/* Edit mode toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="editModeZod"
                  checked={editMode}
                  onCheckedChange={handleEditModeChange}
                />
                <Label htmlFor="editModeZod" className="text-xs sm:text-sm cursor-pointer flex items-center gap-1.5">
                  <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Edit
                </Label>
              </div>
              {editMode && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Manual edits not validated</span>
                </div>
              )}
            </div>

            {/* Output */}
            <div className={cn(
              "h-[250px] sm:h-[280px] rounded-lg border overflow-hidden",
              editMode ? "border-amber-500/50" : "border-border"
            )}>
              {hasData && output ? (
                <CodeViewer
                  value={output}
                  onChange={editMode ? setEditedOutput : undefined}
                  readOnly={!editMode}
                  language="typescript"
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30 text-sm">
                  Enter valid JSON to generate Zod schema
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 sm:pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!hasData} className="h-8 sm:h-9">
            {copied ? (
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={!hasData} className="h-8 sm:h-9">
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
