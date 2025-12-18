"use client";

import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { EditorState, Compartment, StateEffect, StateField } from "@codemirror/state";
import { EditorView, lineNumbers, Decoration, DecorationSet } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { history, historyKeymap } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import { useTheme } from "next-themes";
import { darkTheme, lightTheme } from "@/lib/editor/theme";
import { cn } from "@/lib/utils";

// Effect to update highlighted line
const setHighlightedLine = StateEffect.define<number | null>();

// State field to track highlighted line
const highlightedLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightedLine)) {
        if (effect.value === null) {
          return Decoration.none;
        }
        const line = tr.state.doc.line(effect.value + 1); // 1-indexed
        const deco = Decoration.line({ class: "cm-highlighted-line" }).range(line.from);
        return Decoration.set([deco]);
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Theme for highlighted line
const highlightTheme = EditorView.baseTheme({
  ".cm-highlighted-line": {
    backgroundColor: "rgba(255, 200, 0, 0.2) !important",
  },
  "&dark .cm-highlighted-line": {
    backgroundColor: "rgba(255, 200, 0, 0.15) !important",
  },
});

export interface DiffCodeViewerRef {
  scrollToLine: (line: number) => void;
  highlightLine: (line: number | null) => void;
}

interface DiffCodeViewerProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export const DiffCodeViewer = forwardRef<DiffCodeViewerRef, DiffCodeViewerProps>(
  function DiffCodeViewer({ value, onChange, readOnly = false, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const readOnlyCompartment = useRef(new Compartment());
    const onChangeRef = useRef(onChange);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      setTimeout(() => setMounted(true), 0);
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const view = viewRef.current;
        if (!view) return;

        try {
          const lineInfo = view.state.doc.line(line + 1); // 1-indexed
          view.dispatch({
            effects: EditorView.scrollIntoView(lineInfo.from, {
              y: "center",
            }),
          });
        } catch {
          // Line doesn't exist
        }
      },
      highlightLine(line: number | null) {
        const view = viewRef.current;
        if (!view) return;

        view.dispatch({
          effects: setHighlightedLine.of(line),
        });
      },
    }));

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
          highlightedLineField,
          highlightTheme,
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
    }, [mounted, resolvedTheme, value, readOnly]);

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

    // Update content when value changes externally
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
);
