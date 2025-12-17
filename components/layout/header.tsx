"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { SettingsPopover } from "@/components/settings-popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="flex h-12 items-center justify-between px-4 md:px-6">
        {/* Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-mono font-bold text-foreground/90">{`{`}</span>
            <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              jsont
            </span>
            <span className="text-xl font-mono font-bold text-foreground/90">{`}`}</span>
          </div>
          <span className="text-xs text-muted-foreground/60 hidden sm:block font-medium tracking-wide">
            parse · format · ship
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {/* Privacy indicator - subtle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 transition-colors cursor-default">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden md:inline">local only</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  Your data never leaves your browser. No servers, no tracking, no
                  cookies. Everything runs locally.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <KeyboardShortcutsDialog />
          <SettingsPopover />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
