"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Code, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getSuggestions, applySuggestion, type Suggestion } from "@/lib/jsonpath/autocomplete";

interface JsonPathInputProps {
  value: string;
  onChange: (value: string) => void;
  data: unknown;
  placeholder?: string;
  className?: string;
}

export function JsonPathInput({
  value,
  onChange,
  data,
  placeholder = "$.store.books[*].author",
  className,
}: JsonPathInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Generate suggestions based on current value and data
  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    return getSuggestions(data, value);
  }, [data, value, showSuggestions]);

  // Handle suggestion selection
  const selectSuggestion = useCallback((suggestion: Suggestion) => {
    const newValue = applySuggestion(value, suggestion);
    onChange(newValue);
    setSelectedIndex(0); // Reset selection for new suggestions
    setShowSuggestions(true); // Keep open to chain suggestions
    inputRef.current?.focus();
  }, [value, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      // Open suggestions on any typing
      if (e.key.length === 1 || e.key === "Backspace") {
        setShowSuggestions(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
      case "Tab":
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, selectSuggestion]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setSelectedIndex(0); // Reset selection when typing
    setShowSuggestions(true);
  }, [onChange]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selected = suggestionsRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, showSuggestions]);

  return (
    <div className="relative">
      <Code className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn("h-8 w-72 pl-8 pr-8 text-sm font-mono", className)}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            setShowSuggestions(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 mt-1 w-80 max-h-64 overflow-auto bg-popover border border-border rounded-md shadow-lg z-50"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.value}-${index}`}
              data-selected={index === selectedIndex}
              className={cn(
                "px-3 py-1.5 cursor-pointer flex items-center justify-between gap-2",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded font-mono",
                  suggestion.type === "property" && "bg-blue-500/20 text-blue-500",
                  suggestion.type === "index" && "bg-purple-500/20 text-purple-500",
                  suggestion.type === "wildcard" && "bg-amber-500/20 text-amber-500",
                  suggestion.type === "operator" && "bg-emerald-500/20 text-emerald-500",
                  suggestion.type === "filter" && "bg-rose-500/20 text-rose-500",
                )}>
                  {suggestion.type === "property" && "key"}
                  {suggestion.type === "index" && "idx"}
                  {suggestion.type === "wildcard" && "*"}
                  {suggestion.type === "operator" && "op"}
                  {suggestion.type === "filter" && "?"}
                </span>
                <span className="font-mono text-sm truncate">{suggestion.label}</span>
              </div>
              {suggestion.description && (
                <span className="text-xs text-muted-foreground truncate">
                  {suggestion.description}
                </span>
              )}
            </div>
          ))}
          <div className="px-3 py-1 text-[10px] text-muted-foreground border-t border-border bg-muted/30">
            ↑↓ navigate · Enter select · Esc close
          </div>
        </div>
      )}
    </div>
  );
}
