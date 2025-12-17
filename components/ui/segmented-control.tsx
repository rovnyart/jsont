"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentOption[];
  size?: "sm" | "default";
  className?: string;
}

export function SegmentedControl({
  value,
  onChange,
  options,
  size = "sm",
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md bg-muted p-0.5",
        className
      )}
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center justify-center rounded-sm px-2 text-sm font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            size === "sm" ? "h-7 gap-1" : "h-8 gap-1.5",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
