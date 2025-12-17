"use client";

import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PrivacyBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-default"
          >
            <Shield className="h-3 w-3" />
            <span className="text-xs">100% Browser-Only</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">
            Your data never leaves your browser. No servers, no tracking, no
            cookies. Everything is processed locally on your machine.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
