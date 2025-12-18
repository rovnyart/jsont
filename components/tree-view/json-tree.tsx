"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  X,
  ChevronDown,
  Code,
  Copy,
  Check,
  ChevronUp,
} from "lucide-react";
import { JSONPath } from "jsonpath-plus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TreeNode } from "./tree-node";
import { JsonPathInput } from "./jsonpath-input";
import { cn } from "@/lib/utils";

interface JsonTreeProps {
  data: unknown;
  className?: string;
}

// Collect all paths from JSON data
function collectPaths(data: unknown, path: string = "$"): string[] {
  const paths: string[] = [path];

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      paths.push(...collectPaths(item, `${path}[${index}]`));
    });
  } else if (data !== null && typeof data === "object") {
    Object.entries(data).forEach(([key, value]) => {
      const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
      paths.push(...collectPaths(value, childPath));
    });
  }

  return paths;
}

// Get paths up to a certain depth
function getPathsToDepth(data: unknown, maxDepth: number, path: string = "$", currentDepth: number = 0): string[] {
  if (currentDepth >= maxDepth) return [];

  const paths: string[] = [path];

  if (Array.isArray(data)) {
    if (currentDepth + 1 < maxDepth) {
      data.forEach((item, index) => {
        paths.push(...getPathsToDepth(item, maxDepth, `${path}[${index}]`, currentDepth + 1));
      });
    }
  } else if (data !== null && typeof data === "object") {
    if (currentDepth + 1 < maxDepth) {
      Object.entries(data).forEach(([key, value]) => {
        const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
        paths.push(...getPathsToDepth(value, maxDepth, childPath, currentDepth + 1));
      });
    }
  }

  return paths;
}

// Search for matching paths
function searchPaths(
  data: unknown,
  searchTerm: string,
  path: string = "$"
): Set<string> {
  const matches = new Set<string>();
  const term = searchTerm.toLowerCase();

  function search(value: unknown, currentPath: string) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        search(item, `${currentPath}[${index}]`);
      });
    } else if (value !== null && typeof value === "object") {
      Object.entries(value).forEach(([key, val]) => {
        const childPath = currentPath === "$" ? `$.${key}` : `${currentPath}.${key}`;
        // Check if key matches
        if (key.toLowerCase().includes(term)) {
          matches.add(childPath);
          // Add all parent paths
          addParentPaths(childPath, matches);
        }
        search(val, childPath);
      });
    } else {
      // Primitive value - check if it matches
      if (String(value).toLowerCase().includes(term)) {
        matches.add(currentPath);
        // Add all parent paths
        addParentPaths(currentPath, matches);
      }
    }
  }

  search(data, path);
  return matches;
}

function addParentPaths(path: string, paths: Set<string>) {
  // Parse path and add all parent segments
  let current = "$";
  paths.add(current);

  // Simple parsing - split by . and handle array indices
  const parts = path.slice(2).split(/\.|\[/).filter(Boolean);

  for (const part of parts) {
    if (part.endsWith("]")) {
      current = `${current}[${part}`;
    } else {
      current = current === "$" ? `$.${part}` : `${current}.${part}`;
    }
    paths.add(current);
  }
}

// Execute JSONPath query and return matching paths
interface JsonPathResult {
  paths: Set<string>;
  values: unknown[];
  error: string | null;
}

function executeJsonPath(data: unknown, query: string): JsonPathResult {
  if (!query.trim()) {
    return { paths: new Set(), values: [], error: null };
  }

  try {
    // Get both paths and values from JSONPath
    const result = JSONPath({
      path: query,
      json: data as object,
      resultType: "all",
    });

    const paths = new Set<string>();
    const values: unknown[] = [];

    for (const item of result) {
      // JSONPath returns paths like "$['store']['books'][0]", normalize to our format
      const normalizedPath = normalizeJsonPath(item.path);
      paths.add(normalizedPath);
      // Add parent paths so we can expand to show matches
      addParentPaths(normalizedPath, paths);
      values.push(item.value);
    }

    return { paths, values, error: null };
  } catch (e) {
    return {
      paths: new Set(),
      values: [],
      error: e instanceof Error ? e.message : "Invalid JSONPath query",
    };
  }
}

// Normalize JSONPath paths from jsonpath-plus format to our format
function normalizeJsonPath(path: string): string {
  // Convert $['key'] to $.key and $[0] stays as $[0]
  return path
    .replace(/\['([^']+)'\]/g, ".$1")
    .replace(/\["([^"]+)"\]/g, ".$1")
    .replace(/^\$\./, "$.");
}

export function JsonTree({ data, className }: JsonTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(["$"]));
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"text" | "jsonpath">("jsonpath");
  const [jsonPathQuery, setJsonPathQuery] = useState("");
  const [showResults, setShowResults] = useState(true);
  const [copied, setCopied] = useState(false);

  // Reset expanded paths when data changes
  useEffect(() => {
    setTimeout(() => setExpandedPaths(new Set(["$"])), 0);
  }, [data]);

  // Text search results
  const searchResults = useMemo(() => {
    if (searchMode !== "text" || !searchTerm.trim()) return null;
    return searchPaths(data, searchTerm.trim());
  }, [data, searchTerm, searchMode]);

  // JSONPath query results
  const jsonPathResult = useMemo(() => {
    if (searchMode !== "jsonpath" || !jsonPathQuery.trim()) {
      return { paths: new Set<string>(), values: [], error: null };
    }
    return executeJsonPath(data, jsonPathQuery.trim());
  }, [data, jsonPathQuery, searchMode]);

  // Auto-expand search/query results
  useEffect(() => {
    if (searchMode === "text" && searchResults && searchResults.size > 0) {
      setTimeout(() => setExpandedPaths(new Set(searchResults)), 0);
    } else if (searchMode === "jsonpath" && jsonPathResult.paths.size > 0) {
      setTimeout(() => setExpandedPaths(new Set(jsonPathResult.paths)), 0);
    }
  }, [searchResults, jsonPathResult, searchMode]);

  // Copy JSONPath results
  const handleCopyResults = useCallback(async () => {
    try {
      const text = JSON.stringify(
        jsonPathResult.values.length === 1 ? jsonPathResult.values[0] : jsonPathResult.values,
        null,
        2
      );
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore errors
    }
  }, [jsonPathResult.values]);

  // Toggle a single path
  const handleToggle = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Expand all
  const handleExpandAll = useCallback(() => {
    const allPaths = collectPaths(data);
    setExpandedPaths(new Set(allPaths));
  }, [data]);

  // Collapse all
  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set(["$"]));
  }, []);

  // Expand to depth
  const handleExpandToDepth = useCallback((depth: number) => {
    const paths = getPathsToDepth(data, depth);
    setExpandedPaths(new Set(paths));
  }, [data]);

  // Match count
  const matchCount = searchResults?.size ?? 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
          {/* Expand/Collapse controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleExpandAll} className="h-8 px-2">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Expand</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand all nodes</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleCollapseAll} className="h-8 px-2">
                <ChevronsDownUp className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Collapse</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse all nodes</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <span className="hidden sm:inline">Depth</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Expand to depth</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleExpandToDepth(1)}>
                Level 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExpandToDepth(2)}>
                Level 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExpandToDepth(3)}>
                Level 3
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExpandToDepth(4)}>
                Level 4
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExpandToDepth(5)}>
                Level 5
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Search / JSONPath */}
          <div className="relative">
            {isSearching ? (
              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <div className="flex items-center border border-border rounded-md overflow-hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSearchMode("jsonpath")}
                        className={cn(
                          "h-8 px-2 flex items-center justify-center transition-colors",
                          searchMode === "jsonpath"
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <Code className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>JSONPath query</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSearchMode("text")}
                        className={cn(
                          "h-8 px-2 flex items-center justify-center transition-colors",
                          searchMode === "text"
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Text search</TooltipContent>
                  </Tooltip>
                </div>

                {/* Search input */}
                {searchMode === "jsonpath" ? (
                  <JsonPathInput
                    value={jsonPathQuery}
                    onChange={setJsonPathQuery}
                    data={data}
                  />
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      className="h-8 w-48 pl-8 pr-8 text-sm"
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Match count / result count */}
                {searchMode === "text" && searchTerm && (
                  <span className="text-xs text-muted-foreground">
                    {matchCount} {matchCount === 1 ? "match" : "matches"}
                  </span>
                )}
                {searchMode === "jsonpath" && jsonPathQuery && !jsonPathResult.error && (
                  <span className="text-xs text-muted-foreground">
                    {jsonPathResult.values.length} {jsonPathResult.values.length === 1 ? "result" : "results"}
                  </span>
                )}
                {searchMode === "jsonpath" && jsonPathResult.error && (
                  <span className="text-xs text-destructive truncate max-w-32">
                    {jsonPathResult.error}
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSearching(false);
                    setSearchTerm("");
                    setJsonPathQuery("");
                  }}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSearching(true)}
                    className="h-8 px-2"
                  >
                    <Search className="h-4 w-4" />
                    <span className="ml-1.5 hidden sm:inline">Search</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search in tree</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Tree content */}
        <div className="flex-1 overflow-auto p-2 font-mono text-sm">
          {data !== null && data !== undefined ? (
            <TreeNode
              keyName={null}
              value={data}
              path="$"
              depth={0}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              searchTerm={searchMode === "text" ? searchTerm || undefined : undefined}
              jsonPathMatches={searchMode === "jsonpath" ? jsonPathResult.paths : undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data to display
            </div>
          )}
        </div>

        {/* JSONPath Results Panel */}
        {searchMode === "jsonpath" && jsonPathQuery && jsonPathResult.values.length > 0 && (
          <div className="border-t border-border">
            <div
              className="flex items-center justify-between px-3 py-1.5 bg-muted/30 cursor-pointer hover:bg-muted/50"
              onClick={() => setShowResults(!showResults)}
            >
              <div className="flex items-center gap-2">
                {showResults ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-xs font-medium">
                  Query Results ({jsonPathResult.values.length})
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyResults();
                    }}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy results</TooltipContent>
              </Tooltip>
            </div>
            {showResults && (
              <pre className="p-3 text-xs font-mono overflow-auto max-h-48 bg-muted/20">
                {JSON.stringify(
                  jsonPathResult.values.length === 1
                    ? jsonPathResult.values[0]
                    : jsonPathResult.values,
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
