"use client";

import { useState } from "react";
import { Github, Heart, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WALLET_ADDRESS = "TCJ5FTWZ69uVJ8wwkVzTLmwBRzLYuFQm3j";

export function Footer() {
  const [donateOpen, setDonateOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <footer className="border-t border-border/40 bg-background/50">
        <div className="flex h-10 items-center justify-center px-4 text-xs text-muted-foreground/60 leading-none gap-3">
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
          <span className="text-border">•</span>
          <button
            onClick={() => setDonateOpen(true)}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-pink-500 transition-colors group"
          >
            <Heart className="h-3 w-3 group-hover:fill-pink-500 transition-colors" />
            Donate
          </button>
        </div>
      </footer>

      <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span>🍺</span> Buy Me a Beer
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              If this tool saved you some time (or sanity), consider fueling the next feature with a cold one!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">USDT (TRC20)</span>
                <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">TRON Network</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background rounded px-3 py-2 font-mono break-all select-all">
                  {WALLET_ADDRESS}
                </code>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={copyAddress}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Every satoshi helps keep the JSON flowing! 🚀
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
