"use client";

import { useState, useCallback, memo } from "react";
import { ChevronRight, ChevronDown, Copy, Check, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type JsonValueType = "string" | "number" | "boolean" | "null" | "array" | "object";

interface TreeNodeProps {
  keyName: string | number | null;
  value: unknown;
  path: string;
  depth: number;
  defaultExpanded?: boolean;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  searchTerm?: string;
  isSearchMatch?: boolean;
}

function getValueType(value: unknown): JsonValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as JsonValueType;
}

function getTypeColor(type: JsonValueType): string {
  switch (type) {
    case "string": return "text-emerald-500 dark:text-emerald-400";
    case "number": return "text-blue-500 dark:text-blue-400";
    case "boolean": return "text-amber-500 dark:text-amber-400";
    case "null": return "text-gray-400 dark:text-gray-500";
    case "array": return "text-purple-500 dark:text-purple-400";
    case "object": return "text-rose-500 dark:text-rose-400";
    default: return "text-foreground";
  }
}

function getTypeBadge(type: JsonValueType): string {
  switch (type) {
    case "string": return "str";
    case "number": return "num";
    case "boolean": return "bool";
    case "null": return "null";
    case "array": return "[]";
    case "object": return "{}";
    default: return "";
  }
}

function formatValue(value: unknown, type: JsonValueType): { display: string; full: string | null } {
  if (type === "string") {
    const str = value as string;
    if (str.length > 50) {
      return { display: `"${str.slice(0, 50)}..."`, full: str };
    }
    return { display: `"${str}"`, full: null };
  }
  if (type === "null") return { display: "null", full: null };
  if (type === "boolean") return { display: value ? "true" : "false", full: null };
  if (type === "number") return { display: String(value), full: null };
  return { display: "", full: null };
}

function CopyMenu({ path, value }: { path: string; value: string }) {
  const [copied, setCopied] = useState<"path" | "value" | null>(null);

  const handleCopy = useCallback(async (text: string, type: "path" | "value") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Ignore errors
    }
  }, []);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity"
            >
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">Copy</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => handleCopy(path, "path")} className="text-xs">
          {copied === "path" ? (
            <Check className="h-3 w-3 mr-2 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3 mr-2" />
          )}
          Copy path
          <span className="ml-auto text-muted-foreground font-mono text-[10px] max-w-32 truncate">
            {path}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopy(value, "value")} className="text-xs">
          {copied === "value" ? (
            <Check className="h-3 w-3 mr-2 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3 mr-2" />
          )}
          Copy value
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ValueDisplay({ value, type, valueMatches }: {
  value: unknown;
  type: JsonValueType;
  valueMatches: boolean;
}) {
  const formatted = formatValue(value, type);

  const valueSpan = (
    <span className={cn(
      "font-mono text-sm",
      getTypeColor(type),
      valueMatches && "bg-yellow-500/40 rounded px-0.5"
    )}>
      {formatted.display}
    </span>
  );

  // Show tooltip for truncated strings
  if (formatted.full) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {valueSpan}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md break-all font-mono text-xs">
          {formatted.full}
        </TooltipContent>
      </Tooltip>
    );
  }

  return valueSpan;
}

export const TreeNode = memo(function TreeNode({
  keyName,
  value,
  path,
  depth,
  expandedPaths,
  onToggle,
  searchTerm,
  isSearchMatch,
}: TreeNodeProps) {
  const type = getValueType(value);
  const isExpandable = type === "array" || type === "object";
  const isExpanded = expandedPaths.has(path);

  const handleToggle = useCallback(() => {
    onToggle(path);
  }, [onToggle, path]);

  // Get child count for arrays/objects
  const childCount = isExpandable
    ? Array.isArray(value)
      ? (value as unknown[]).length
      : Object.keys(value as object).length
    : 0;

  // Render children if expanded
  const renderChildren = () => {
    if (!isExpandable || !isExpanded) return null;

    if (Array.isArray(value)) {
      return (value as unknown[]).map((item, index) => (
        <TreeNode
          key={index}
          keyName={index}
          value={item}
          path={`${path}[${index}]`}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          searchTerm={searchTerm}
        />
      ));
    }

    return Object.entries(value as object).map(([key, val]) => (
      <TreeNode
        key={key}
        keyName={key}
        value={val}
        path={path === "$" ? `$.${key}` : `${path}.${key}`}
        depth={depth + 1}
        expandedPaths={expandedPaths}
        onToggle={onToggle}
        searchTerm={searchTerm}
      />
    ));
  };

  // Check if this node matches search
  const keyMatches = searchTerm && keyName !== null &&
    String(keyName).toLowerCase().includes(searchTerm.toLowerCase());
  const valueMatches = searchTerm && !isExpandable &&
    String(value).toLowerCase().includes(searchTerm.toLowerCase());
  const matches = isSearchMatch || keyMatches || valueMatches;

  // Get value to copy (stringify for objects/arrays)
  const copyValue = isExpandable ? JSON.stringify(value, null, 2) : String(value);

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-center gap-1 py-0.5 px-1 rounded-sm hover:bg-accent/50 cursor-pointer",
          matches && "bg-yellow-500/20 hover:bg-yellow-500/30"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={isExpandable ? handleToggle : undefined}
      >
        {/* Expand/collapse toggle */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isExpandable ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* Key name */}
        {keyName !== null && (
          <>
            <span className={cn(
              "font-mono text-sm",
              typeof keyName === "number" ? "text-muted-foreground" : "text-foreground",
              keyMatches && "bg-yellow-500/40 rounded px-0.5"
            )}>
              {typeof keyName === "string" ? `"${keyName}"` : keyName}
            </span>
            <span className="text-muted-foreground">:</span>
          </>
        )}

        {/* Value or type indicator */}
        {isExpandable ? (
          <span className="flex items-center gap-1.5">
            <span className={cn("text-xs font-mono", getTypeColor(type))}>
              {type === "array" ? "[" : "{"}
            </span>
            <span className="text-xs text-muted-foreground">
              {childCount} {childCount === 1 ? (type === "array" ? "item" : "key") : (type === "array" ? "items" : "keys")}
            </span>
            {!isExpanded && (
              <span className={cn("text-xs font-mono", getTypeColor(type))}>
                {type === "array" ? "]" : "}"}
              </span>
            )}
          </span>
        ) : (
          <ValueDisplay
            value={value}
            type={type}
            valueMatches={!!valueMatches}
          />
        )}

        {/* Type badge */}
        <span className={cn(
          "text-[10px] px-1 py-0.5 rounded bg-muted/50 font-mono ml-1",
          getTypeColor(type)
        )}>
          {getTypeBadge(type)}
        </span>

        {/* Copy menu */}
        <div className="ml-auto">
          <CopyMenu path={path} value={copyValue} />
        </div>
      </div>

      {/* Children */}
      {isExpanded && renderChildren()}

      {/* Closing bracket */}
      {isExpandable && isExpanded && (
        <div
          className="text-xs font-mono text-muted-foreground"
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
        >
          {type === "array" ? "]" : "}"}
        </div>
      )}
    </div>
  );
});
