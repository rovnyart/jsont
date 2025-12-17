"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { history, historyKeymap } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import { useTheme } from "next-themes";
import { darkTheme, lightTheme } from "@/lib/editor/theme";
import { cn } from "@/lib/utils";

interface CodeViewerProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: "json";
  className?: string;
}

export function CodeViewer({
  value,
  onChange,
  readOnly = true,
  language = "json",
  className
}: CodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Keep onChange ref up to date
  onChangeRef.current = onChange;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create editor
  useEffect(() => {
    if (!containerRef.current || !mounted) return;

    const theme = resolvedTheme === "dark" ? darkTheme : lightTheme;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of(historyKeymap),
        json(),
        theme,
        readOnlyCompartment.current.of([
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
        ]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChangeRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [mounted, resolvedTheme]);

  // Update readOnly state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly]);

  // Update content when value changes (only if readOnly or content differs)
  useEffect(() => {
    const view = viewRef.current;
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

  if (!mounted) {
    return <div className={cn("animate-pulse bg-muted rounded", className)} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "[&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto",
        className
      )}
    />
  );
}
