"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Send,
  Plus,
  Trash2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CodeViewer } from "@/components/ui/code-viewer";
import {
  generateCurl,
  generateFetchAsync,
  generateAxios,
  getDefaultHeaders,
  type HttpMethod,
  type RequestHeader,
  type RequestConfig,
} from "@/lib/generators/request-snippets";

type SnippetType = "curl" | "fetch" | "axios";

interface RequestDialogProps {
  /** JSON body content */
  body: string;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  PATCH: "text-purple-500",
  DELETE: "text-red-500",
};

export function RequestDialog({
  body,
  open: controlledOpen,
  onOpenChange,
}: RequestDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const [snippetType, setSnippetType] = useState<SnippetType>("curl");
  const [copied, setCopied] = useState(false);

  // Load saved state from localStorage
  const [method, setMethod] = useState<HttpMethod>(() => {
    if (typeof window === "undefined") return "POST";
    const saved = localStorage.getItem("jsont-request-method");
    return (saved as HttpMethod) || "POST";
  });

  const [url, setUrl] = useState(() => {
    if (typeof window === "undefined") return "https://api.example.com/endpoint";
    return localStorage.getItem("jsont-request-url") || "https://api.example.com/endpoint";
  });

  const [headers, setHeaders] = useState<RequestHeader[]>(() => {
    if (typeof window === "undefined") return getDefaultHeaders();
    const saved = localStorage.getItem("jsont-request-headers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultHeaders();
      }
    }
    return getDefaultHeaders();
  });

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem("jsont-request-method", method);
  }, [method]);

  useEffect(() => {
    localStorage.setItem("jsont-request-url", url);
  }, [url]);

  useEffect(() => {
    localStorage.setItem("jsont-request-headers", JSON.stringify(headers));
  }, [headers]);

  // Reset copied state when dialog opens
  useEffect(() => {
    if (open) {
      setCopied(false);
    }
  }, [open]);

  // Build request config
  const config: RequestConfig = useMemo(
    () => ({
      method,
      url,
      headers,
      body: ["POST", "PUT", "PATCH"].includes(method) ? body : null,
    }),
    [method, url, headers, body]
  );

  // Generate snippet based on selected type
  const snippet = useMemo(() => {
    switch (snippetType) {
      case "curl":
        return generateCurl(config);
      case "fetch":
        return generateFetchAsync(config);
      case "axios":
        return generateAxios(config);
      default:
        return "";
    }
  }, [snippetType, config]);

  // Header management
  const handleHeaderChange = useCallback(
    (index: number, field: "key" | "value", value: string) => {
      setHeaders((prev) =>
        prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
      );
    },
    []
  );

  const handleHeaderToggle = useCallback((index: number) => {
    setHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, enabled: !h.enabled } : h))
    );
  }, []);

  const handleAddHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: "", value: "", enabled: true }]);
  }, []);

  const handleRemoveHeader = useCallback((index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [snippet]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[90vw] max-w-4xl max-h-[85vh] flex flex-col"
        style={{ width: "90vw", maxWidth: "900px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Request Builder
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0 mt-4 overflow-hidden">
          {/* URL and Method */}
          <div className="flex gap-2">
            <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
              <SelectTrigger className="w-28">
                <SelectValue>
                  <span className={cn("font-mono font-semibold", METHOD_COLORS[method])}>
                    {method}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    <span className={cn("font-mono font-semibold", METHOD_COLORS[m])}>
                      {m}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="pl-9 font-mono text-sm"
              />
            </div>
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Headers</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddHeader}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Checkbox
                    checked={header.enabled}
                    onCheckedChange={() => handleHeaderToggle(index)}
                  />
                  <Input
                    value={header.key}
                    onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                    placeholder="Header name"
                    className={cn(
                      "flex-1 h-8 text-sm font-mono",
                      !header.enabled && "opacity-50"
                    )}
                  />
                  <Input
                    value={header.value}
                    onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
                    placeholder="Value"
                    className={cn(
                      "flex-1 h-8 text-sm font-mono",
                      !header.enabled && "opacity-50"
                    )}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveHeader(index)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Code Output */}
          <div>
            <Tabs
              value={snippetType}
              onValueChange={(v) => setSnippetType(v as SnippetType)}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="fetch">fetch</TabsTrigger>
                <TabsTrigger value="axios">axios</TabsTrigger>
              </TabsList>

              {(["curl", "fetch", "axios"] as SnippetType[]).map(
                (type) => (
                  <TabsContent key={type} value={type} className="mt-2">
                    <div className="h-[280px] rounded-lg border overflow-hidden">
                      <CodeViewer
                        value={snippet}
                        readOnly
                        language="javascript"
                        className="h-full"
                      />
                    </div>
                  </TabsContent>
                )
              )}
            </Tabs>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {["POST", "PUT", "PATCH"].includes(method) ? (
              <span>Body: {body.length.toLocaleString()} chars</span>
            ) : (
              <span className="text-amber-500">
                {method} requests don&apos;t include body
              </span>
            )}
          </div>
          <Button onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
