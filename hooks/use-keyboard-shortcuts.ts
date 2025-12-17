"use client";

import { useEffect, useCallback } from "react";

export interface ShortcutHandlers {
  onFormat?: () => void;
  onMinify?: () => void;
  onCopy?: () => void;
  onClear?: () => void;
  onSort?: () => void;
}

/**
 * Hook to handle global keyboard shortcuts
 *
 * Shortcuts:
 * - Cmd/Ctrl + Enter: Format
 * - Cmd/Ctrl + Shift + M: Minify
 * - Cmd/Ctrl + Shift + C: Copy
 * - Cmd/Ctrl + Shift + S: Sort (recursive)
 * - Cmd/Ctrl + Shift + X: Clear
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (!isMod) return;

      // Cmd/Ctrl + Enter: Format
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handlers.onFormat?.();
        return;
      }

      // Cmd/Ctrl + Shift + M: Minify
      if (e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        handlers.onMinify?.();
        return;
      }

      // Cmd/Ctrl + Shift + C: Copy
      if (e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handlers.onCopy?.();
        return;
      }

      // Cmd/Ctrl + Shift + S: Sort
      if (e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handlers.onSort?.();
        return;
      }

      // Cmd/Ctrl + Shift + X: Clear
      if (e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        handlers.onClear?.();
        return;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
