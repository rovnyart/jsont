"use client";

import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50">
      <div className="flex h-10 items-center justify-center px-4 text-xs text-muted-foreground/60 leading-none">
        <span className="flex items-center gap-1.5">
          Built with
          <span className="animate-pulse">❤️</span>
          and
          <span>🍺</span>
          by
          <a
            href="https://github.com/rovnyart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-3 w-3" />
            rovnyart
          </a>
        </span>
      </div>
    </footer>
  );
}
