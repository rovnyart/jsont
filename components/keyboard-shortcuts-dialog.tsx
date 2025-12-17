"use client";

import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const shortcuts = [
  { keys: ["⌘", "↵"], action: "Format JSON", description: "Pretty print with configured indent" },
  { keys: ["⌘", "⇧", "M"], action: "Minify", description: "Compress to single line" },
  { keys: ["⌘", "⇧", "S"], action: "Sort Keys", description: "Sort all keys recursively" },
  { keys: ["⌘", "⇧", "C"], action: "Copy", description: "Copy to clipboard" },
  { keys: ["⌘", "⇧", "X"], action: "Clear", description: "Clear editor contents" },
  { keys: ["⌘", "⇧", "T"], action: "Toggle View", description: "Switch between Raw and Tree view" },
];

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  return (
    <Dialog>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{shortcut.action}</div>
                <div className="text-xs text-muted-foreground">
                  {shortcut.description}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <ShortcutKey key={i}>{key}</ShortcutKey>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            On Windows/Linux, use <ShortcutKey>Ctrl</ShortcutKey> instead of <ShortcutKey>⌘</ShortcutKey>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
