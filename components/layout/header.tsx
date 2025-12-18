'use client';

import { useState, useRef, useCallback } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { SettingsPopover } from '@/components/settings-popover';
import { GameDialog } from '@/components/game/game-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getRequiredClicks } from '@/lib/game/game-utils';
import { isStrictJson } from '@/lib/parser/relaxed-json';

// localStorage key (same as in use-local-storage.ts)
const STORAGE_KEY = 'jsont-editor-content';

// Click timeout for trigger (2 seconds)
const CLICK_TIMEOUT = 2000;

export function Header() {
  const [gameOpen, setGameOpen] = useState(false);
  const [jsonData, setJsonData] = useState<unknown>(null);

  // Click tracking
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requiredClicksRef = useRef(0);

  // Handle logo click for easter egg trigger
  const handleLogoClick = useCallback(() => {
    // Get current JSON from localStorage
    let currentJson = '';
    try {
      currentJson = localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return; // localStorage not available
    }

    // Validate - must be strict valid JSON only
    if (!isStrictJson(currentJson)) {
      // Not valid JSON - reset and do nothing
      clickCountRef.current = 0;
      return;
    }

    // Parse the valid JSON
    const jsonData = JSON.parse(currentJson);

    // Ensure data is structured (object or array), not just a primitive
    const isStructured = typeof jsonData === 'object' && jsonData !== null;
    if (!isStructured) {
      // Just a primitive value - not valid for the game
      clickCountRef.current = 0;
      return;
    }

    // Calculate required clicks on first click
    if (clickCountRef.current === 0) {
      requiredClicksRef.current = getRequiredClicks(currentJson);
    }

    // Increment click count
    clickCountRef.current++;

    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Check if we've reached the required clicks
    if (clickCountRef.current >= requiredClicksRef.current) {
      // Trigger game!
      clickCountRef.current = 0;
      setJsonData(jsonData);
      setGameOpen(true);
    } else {
      // Set timeout to reset click count
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, CLICK_TIMEOUT);
    }
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex h-12 items-center justify-between px-4 md:px-6">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 cursor-pointer select-none transition-transform active:scale-95"
              onClick={handleLogoClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleLogoClick();
                }
              }}
            >
              <span className="text-xl font-mono font-bold text-foreground/90">{`{`}</span>
              <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                json&apos;t
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
                    Your data never leaves your browser. No servers, no
                    tracking, no cookies. Everything runs locally.
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

      {/* Game Dialog */}
      <GameDialog
        open={gameOpen}
        onOpenChange={setGameOpen}
        jsonData={jsonData}
      />
    </>
  );
}
