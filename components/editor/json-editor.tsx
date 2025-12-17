"use client";

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { bracketMatching, foldGutter, foldKeymap } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { lintGutter, linter } from "@codemirror/lint";
import { darkTheme, lightTheme } from "@/lib/editor/theme";
import { jsonLinter } from "@/lib/editor/json-linter";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (text: string) => boolean; // Return true to prevent default paste
  readOnly?: boolean;
  placeholder?: string;
}

export interface JsonEditorRef {
  scrollToPosition: (pos: number) => void;
}

export const JsonEditor = forwardRef<JsonEditorRef, JsonEditorProps>(function JsonEditor(
  {
    value,
    onChange,
    onPaste,
    readOnly = false,
    placeholder: placeholderText = "Paste your JSON here...",
  },
  ref
) {
  const editorRef = useRef<EditorView | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onPasteRef = useRef(onPaste);
  const valueRef = useRef(value);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Keep refs up to date (synchronous assignment, not in effects)
  onChangeRef.current = onChange;
  onPasteRef.current = onPaste;

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Expose scrollToPosition method via ref
  useImperativeHandle(ref, () => ({
    scrollToPosition: (pos: number) => {
      const view = editorRef.current;
      if (!view) return;

      // Clamp position to valid range
      const docLength = view.state.doc.length;
      const safePos = Math.max(0, Math.min(pos, docLength));

      // Scroll to position and select
      view.dispatch({
        selection: { anchor: safePos },
        scrollIntoView: true,
      });
      view.focus();
    },
  }), []);

  // Create editor when container is available
  const initEditor = useCallback((container: HTMLDivElement | null) => {
    // Cleanup previous editor if it exists
    if (editorRef.current) {
      editorRef.current.destroy();
      editorRef.current = null;
    }

    if (!container) {
      containerRef.current = null;
      return;
    }

    containerRef.current = container;

    const initialTheme = document.documentElement.classList.contains("dark")
      ? darkTheme
      : lightTheme;

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        lineNumbers(),
        history(),
        foldGutter(),
        bracketMatching(),
        highlightSelectionMatches(),
        lintGutter(),
        linter(jsonLinter, { delay: 300 }),
        json(),
        themeCompartmentRef.current.of(initialTheme),
        placeholder(placeholderText),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            valueRef.current = newValue;
            onChangeRef.current(newValue);
          }
        }),
        EditorView.domEventHandlers({
          paste: (event) => {
            const text = event.clipboardData?.getData("text/plain");
            if (text && onPasteRef.current) {
              const handled = onPasteRef.current(text);
              if (handled) {
                event.preventDefault();
                return true;
              }
            }
            return false;
          },
        }),
        EditorState.readOnly.of(readOnly),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: container,
    });

    editorRef.current = view;
    // Only focus if there's content, otherwise show clean placeholder
    if (valueRef.current.trim()) {
      view.focus();
    }
  }, [placeholderText, readOnly]);

  // Handle theme changes
  useEffect(() => {
    if (editorRef.current && mounted) {
      const newTheme = resolvedTheme === "dark" ? darkTheme : lightTheme;
      editorRef.current.dispatch({
        effects: themeCompartmentRef.current.reconfigure(newTheme),
      });
    }
  }, [resolvedTheme, mounted]);

  // Update editor content when value prop changes externally
  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (value !== currentContent) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Show loading state before hydration
  if (!mounted) {
    return (
      <div className="h-full min-h-[400px] rounded-lg border border-border bg-background animate-pulse" />
    );
  }

  const isEmpty = !value || value.trim() === "";

  return (
    <div
      ref={initEditor}
      className={cn(
        "h-full min-h-[400px] overflow-hidden rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:min-h-[400px]",
        // Hide cursor and line numbers when showing placeholder
        isEmpty && "[&_.cm-cursor]:!hidden [&_.cm-cursorLayer]:!hidden [&_.cm-gutters]:!hidden [&_.cm-lineNumbers]:!hidden"
      )}
    />
  );
});
