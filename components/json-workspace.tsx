"use client";

import { EditorPanel } from "@/components/editor";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function JsonWorkspace() {
  const { value, setValue, isLoaded } = useLocalStorage();

  // Show loading state while restoring from localStorage
  if (!isLoaded) {
    return (
      <div className="h-[calc(100vh-8rem)] rounded-lg border border-border bg-background animate-pulse" />
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <EditorPanel value={value} onChange={setValue} />
    </div>
  );
}
