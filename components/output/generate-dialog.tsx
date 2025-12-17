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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
  disabled?: boolean;
}

export function GenerateDialog({ data, disabled }: GenerateDialogProps) {
  const [open, setOpen] = useState(false);
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
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="h-8 px-2"
              >
                <Sparkles className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Generate</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Generate schema or types</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="w-[90vw] max-w-4xl max-h-[85vh] flex flex-col"  style={{ width: "90vw", maxWidth: "900px" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Schema / Types
          </DialogTitle>
        </DialogHeader>

        <Tabs value={generator} onValueChange={(v) => setGenerator(v as GeneratorType)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="json-schema" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON Schema
            </TabsTrigger>
            <TabsTrigger value="typescript" className="gap-2">
              <Braces className="h-4 w-4" />
              TypeScript
            </TabsTrigger>
            <TabsTrigger value="zod" className="gap-2">
              <Shield className="h-4 w-4" />
              Zod
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json-schema" className="mt-4">
            {/* Options */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="allRequired"
                  checked={schemaOptions.allRequired}
                  onCheckedChange={(checked) =>
                    setSchemaOptions(prev => ({ ...prev, allRequired: checked }))
                  }
                />
                <Label htmlFor="allRequired" className="text-sm cursor-pointer">
                  All required
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
                <Label htmlFor="strictMode" className="text-sm cursor-pointer">
                  Strict mode
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
                <Label htmlFor="includeExamples" className="text-sm cursor-pointer">
                  Examples
                </Label>
              </div>

              <Input
                value={schemaOptions.title || ""}
                onChange={(e) =>
                  setSchemaOptions(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder="Schema title"
                className="h-8 text-sm"
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
                <Label htmlFor="editMode" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit mode
                </Label>
              </div>
              {editMode && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Manual edits are not validated</span>
                </div>
              )}
            </div>

            {/* Output */}
            <div className={cn(
              "h-[340px] rounded-lg border overflow-hidden",
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
                <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30">
                  Enter valid JSON to generate schema
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="typescript" className="mt-4">
            {/* TypeScript Options */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="tsStyle"
                  checked={tsOptions.style === "type"}
                  onCheckedChange={(checked) =>
                    setTsOptions(prev => ({ ...prev, style: checked ? "type" : "interface" }))
                  }
                />
                <Label htmlFor="tsStyle" className="text-sm cursor-pointer">
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
                <Label htmlFor="tsExport" className="text-sm cursor-pointer">
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
                <Label htmlFor="tsOptional" className="text-sm cursor-pointer">
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
                <Label htmlFor="tsReadonly" className="text-sm cursor-pointer">
                  Readonly
                </Label>
              </div>

              <Input
                value={tsOptions.rootName}
                onChange={(e) =>
                  setTsOptions(prev => ({ ...prev, rootName: e.target.value }))
                }
                placeholder="Root"
                className="h-8 text-sm"
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
                <Label htmlFor="editModeTs" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit mode
                </Label>
              </div>
              {editMode && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Manual edits are not validated</span>
                </div>
              )}
            </div>

            {/* Output */}
            <div className={cn(
              "h-[280px] rounded-lg border overflow-hidden",
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
                <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30">
                  Enter valid JSON to generate TypeScript
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="zod" className="mt-4">
            {/* Zod Options */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="zodNullable"
                  checked={zodOptions.useNullable}
                  onCheckedChange={(checked) =>
                    setZodOptions(prev => ({ ...prev, useNullable: checked }))
                  }
                />
                <Label htmlFor="zodNullable" className="text-sm cursor-pointer">
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
                <Label htmlFor="zodStrict" className="text-sm cursor-pointer">
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
                <Label htmlFor="zodDates" className="text-sm cursor-pointer">
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
                <Label htmlFor="zodEnums" className="text-sm cursor-pointer">
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
                <Label htmlFor="zodDescriptions" className="text-sm cursor-pointer">
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
                <Label htmlFor="editModeZod" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit mode
                </Label>
              </div>
              {editMode && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Manual edits are not validated</span>
                </div>
              )}
            </div>

            {/* Output */}
            <div className={cn(
              "h-[280px] rounded-lg border overflow-hidden",
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
                <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30">
                  Enter valid JSON to generate Zod schema
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleCopy} disabled={!hasData}>
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button onClick={handleDownload} disabled={!hasData}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
