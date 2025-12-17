"use client";

import { Braces } from "lucide-react";
import { PrivacyBadge } from "@/components/privacy-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { SettingsPopover } from "@/components/settings-popover";
import { Separator } from "@/components/ui/separator";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Braces className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">JSONT</span>
          </div>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <span className="text-sm text-muted-foreground hidden sm:block">
            JSON Tools for Developers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PrivacyBadge />
          <KeyboardShortcutsDialog />
          <SettingsPopover />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
