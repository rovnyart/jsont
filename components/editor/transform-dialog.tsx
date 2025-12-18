"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Binary,
  ArrowRight,
  Link,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  escapeJsonString,
  unescapeJsonString,
} from "@/lib/encoding";

type TransformCategory = "base64" | "url" | "string";

interface TransformDialogProps {
  /** Current editor content to pre-fill encode operations */
  editorContent: string;
  /** Controlled open state (optional - if not provided, uses internal state) */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function TransformDialog({ editorContent, open: controlledOpen, onOpenChange }: TransformDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useMemo(() => {
    return isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  }, [isControlled, onOpenChange]);
  const [category, setCategory] = useState<TransformCategory>("base64");
  const [copied, setCopied] = useState<"encode" | "decode" | null>(null);

  // Separate inputs for encode (from editor) and decode (user paste)
  const [decodeInput, setDecodeInput] = useState("");

  // Reset decode input when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setDecodeInput("");
      setCopied(null);
    }
  }, [setOpen]);

  // Encode results (from editor content)
  const encodeResult = useMemo(() => {
    if (!editorContent) return { success: false, data: "", error: "No content to encode" };

    switch (category) {
      case "base64":
        return base64Encode(editorContent);
      case "url":
        return urlEncode(editorContent);
      case "string":
        return escapeJsonString(editorContent);
      default:
        return { success: false, error: "Unknown operation" };
    }
  }, [editorContent, category]);

  // Decode results (from user input)
  const decodeResult = useMemo(() => {
    if (!decodeInput.trim()) return { success: false, data: "", error: "Paste content to decode" };

    switch (category) {
      case "base64":
        return base64Decode(decodeInput);
      case "url":
        return urlDecode(decodeInput);
      case "string":
        return unescapeJsonString(decodeInput);
      default:
        return { success: false, error: "Unknown operation" };
    }
  }, [decodeInput, category]);

  // Copy handlers
  const handleCopyEncode = useCallback(async () => {
    if (!encodeResult.success || !encodeResult.data) return;
    try {
      await navigator.clipboard.writeText(encodeResult.data);
      setCopied("encode");
      setTimeout(() => setCopied(null), 2000);
      toast.success("Copied encoded result");
    } catch {
      toast.error("Failed to copy");
    }
  }, [encodeResult]);

  const handleCopyDecode = useCallback(async () => {
    if (!decodeResult.success || !decodeResult.data) return;
    try {
      await navigator.clipboard.writeText(decodeResult.data);
      setCopied("decode");
      setTimeout(() => setCopied(null), 2000);
      toast.success("Copied decoded result");
    } catch {
      toast.error("Failed to copy");
    }
  }, [decodeResult]);

  const getCategoryLabel = (cat: TransformCategory) => {
    switch (cat) {
      case "base64": return "Base64";
      case "url": return "URL";
      case "string": return "String";
    }
  };

  const hasContent = editorContent.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[90vw] max-w-3xl max-h-[85vh] flex flex-col" style={{ width: "90vw", maxWidth: "800px" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Binary className="h-5 w-5" />
            Transform Content
          </DialogTitle>
        </DialogHeader>

        <Tabs value={category} onValueChange={(v) => setCategory(v as TransformCategory)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="base64" className="gap-2">
              <Binary className="h-4 w-4" />
              Base64
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="string" className="gap-2">
              <Quote className="h-4 w-4" />
              String
            </TabsTrigger>
          </TabsList>

          {/* Same content structure for all tabs */}
          {(["base64", "url", "string"] as TransformCategory[]).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-4 flex-1 flex flex-col gap-6">
              {/* Encode section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-xs font-semibold">
                      ENCODE
                    </span>
                    Editor content → {getCategoryLabel(cat)}
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyEncode}
                    disabled={!encodeResult.success}
                    className="h-7"
                  >
                    {copied === "encode" ? (
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {copied === "encode" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className={cn(
                  "relative rounded-lg border bg-muted/30 p-3 font-mono text-sm",
                  encodeResult.success ? "border-border" : "border-destructive/50"
                )}>
                  {hasContent ? (
                    encodeResult.success ? (
                      <pre className="whitespace-pre-wrap break-all max-h-[120px] overflow-auto">
                        {encodeResult.data}
                      </pre>
                    ) : (
                      <span className="text-destructive">{encodeResult.error}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">Enter content in editor to encode</span>
                  )}
                </div>
              </div>

              {/* Decode section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs font-semibold">
                      DECODE
                    </span>
                    {getCategoryLabel(cat)} → Plain text
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDecode}
                    disabled={!decodeResult.success}
                    className="h-7"
                  >
                    {copied === "decode" ? (
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {copied === "decode" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  value={decodeInput}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecodeInput(e.target.value)}
                  placeholder={`Paste ${getCategoryLabel(cat).toLowerCase()} encoded content here...`}
                  className="font-mono text-sm h-[80px] resize-none"
                />
                {decodeInput.trim() && (
                  <div className={cn(
                    "flex items-start gap-2 rounded-lg border bg-muted/30 p-3 font-mono text-sm",
                    decodeResult.success ? "border-border" : "border-destructive/50"
                  )}>
                    <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    {decodeResult.success ? (
                      <pre className="whitespace-pre-wrap break-all max-h-[120px] overflow-auto flex-1">
                        {decodeResult.data}
                      </pre>
                    ) : (
                      <span className="text-destructive">{decodeResult.error}</span>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
