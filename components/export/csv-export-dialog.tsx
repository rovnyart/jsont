"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeViewer } from "@/components/ui/code-viewer";
import {
  generateCsv,
  defaultCsvOptions,
  getDelimiterName,
  extractHeaders,
  type CsvOptions,
} from "@/lib/generators/csv";

interface CsvExportDialogProps {
  data: unknown[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CsvExportDialog({ data, open: controlledOpen, onOpenChange }: CsvExportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState<CsvOptions>({
    ...defaultCsvOptions,
  });

  // Extract headers for preview info
  const headers = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return extractHeaders(data);
  }, [data]);

  // Generate CSV output
  const csvOutput = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    try {
      return generateCsv(data, options);
    } catch (error) {
      return `// Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }, [data, options]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!csvOutput) return;
    try {
      await navigator.clipboard.writeText(csvOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [csvOutput]);

  // Download file
  const handleDownload = useCallback(() => {
    if (!csvOutput) return;

    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded export.csv");
  }, [csvOutput]);

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6"
        style={{ maxWidth: "800px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
            Export to CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
          {/* Info bar */}
          {hasData && (
            <div className="text-xs text-muted-foreground mb-3 flex items-center gap-4">
              <span>{data.length} rows</span>
              <span>{headers.length} columns</span>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Delimiter</Label>
              <Select
                value={options.delimiter}
                onValueChange={(value) =>
                  setOptions(prev => ({ ...prev, delimiter: value as CsvOptions["delimiter"] }))
                }
              >
                <SelectTrigger className="h-8 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">{getDelimiterName(",")}</SelectItem>
                  <SelectItem value=";">{getDelimiterName(";")}</SelectItem>
                  <SelectItem value={"\t"}>{getDelimiterName("\t")}</SelectItem>
                  <SelectItem value="|">{getDelimiterName("|")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Quote Char</Label>
              <Select
                value={options.quoteChar}
                onValueChange={(value) =>
                  setOptions(prev => ({ ...prev, quoteChar: value as CsvOptions["quoteChar"] }))
                }
              >
                <SelectTrigger className="h-8 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'"'}>Double &quot;</SelectItem>
                  <SelectItem value={"'"}>Single &apos;</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Line Ending</Label>
              <Select
                value={options.newline}
                onValueChange={(value) =>
                  setOptions(prev => ({ ...prev, newline: value as CsvOptions["newline"] }))
                }
              >
                <SelectTrigger className="h-8 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"\r\n"}>CRLF (Windows)</SelectItem>
                  <SelectItem value={"\n"}>LF (Unix)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 pb-0.5">
              <Switch
                id="csvQuotes"
                checked={options.quotes}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, quotes: checked }))
                }
              />
              <Label htmlFor="csvQuotes" className="text-xs sm:text-sm cursor-pointer">
                Quote All
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Switch
                id="csvHeader"
                checked={options.header}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, header: checked }))
                }
              />
              <Label htmlFor="csvHeader" className="text-xs sm:text-sm cursor-pointer">
                Include Header
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="csvFlatten"
                checked={options.flattenObjects}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, flattenObjects: checked }))
                }
              />
              <Label htmlFor="csvFlatten" className="text-xs sm:text-sm cursor-pointer">
                Flatten Objects
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="csvFlattenArrays"
                checked={options.flattenArrays}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, flattenArrays: checked }))
                }
              />
              <Label htmlFor="csvFlattenArrays" className="text-xs sm:text-sm cursor-pointer">
                Flatten Arrays
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="csvSkipEmpty"
                checked={options.skipEmptyLines}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, skipEmptyLines: checked }))
                }
              />
              <Label htmlFor="csvSkipEmpty" className="text-xs sm:text-sm cursor-pointer">
                Skip Empty
              </Label>
            </div>
          </div>

          {/* Output */}
          <div className="h-[250px] sm:h-[300px] rounded-lg border border-border overflow-hidden">
            {hasData && csvOutput ? (
              <CodeViewer
                value={csvOutput}
                readOnly
                language="text"
                className="h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30 text-sm">
                Enter a valid JSON array to export as CSV
              </div>
            )}
          </div>
        </div>

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
