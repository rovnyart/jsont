"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/use-settings";

export function SettingsPopover() {
  const { settings, updateSetting } = useSettings();

  return (
    <Popover>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Settings</h4>
            <p className="text-xs text-muted-foreground">
              Customize your JSON editor experience
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="format-on-paste"
                className="text-sm font-normal cursor-pointer flex-1 pr-2"
              >
                Format on paste
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-format JSON when pasting
                </p>
              </Label>
              <Switch
                id="format-on-paste"
                checked={settings.formatOnPaste}
                onCheckedChange={(checked) =>
                  updateSetting("formatOnPaste", checked)
                }
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
