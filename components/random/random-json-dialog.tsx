"use client";

import { useState, useCallback, useMemo } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  generateRandomJson,
  type RootType,
  type DataSize,
} from "@/lib/generators/random-json";

interface RandomJsonDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onGenerate: (json: string) => void;
}

export function RandomJsonDialog({
  open: controlledOpen,
  onOpenChange,
  onGenerate,
}: RandomJsonDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useMemo(() => {
    return isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  }, [isControlled, onOpenChange]);

  const [rootType, setRootType] = useState<RootType>("object");
  const [size, setSize] = useState<DataSize>("medium");

  const handleGenerate = useCallback(() => {
    const data = generateRandomJson({ rootType, size });
    const json = JSON.stringify(data, null, 2);
    onGenerate(json);
    setOpen(false);
  }, [rootType, size, onGenerate, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dices className="h-5 w-5" />
            Generate Random JSON
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Root Type</Label>
            <RadioGroup
              value={rootType}
              onValueChange={(v) => setRootType(v as RootType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="object" id="root-object" />
                <Label htmlFor="root-object" className="cursor-pointer font-normal">
                  Object <span className="text-muted-foreground">{"{}"}</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="array" id="root-array" />
                <Label htmlFor="root-array" className="cursor-pointer font-normal">
                  Array <span className="text-muted-foreground">{"[]"}</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Size</Label>
            <RadioGroup
              value={size}
              onValueChange={(v) => setSize(v as DataSize)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="size-small" />
                <Label htmlFor="size-small" className="cursor-pointer font-normal">
                  Small
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="size-medium" />
                <Label htmlFor="size-medium" className="cursor-pointer font-normal">
                  Medium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="size-large" />
                <Label htmlFor="size-large" className="cursor-pointer font-normal">
                  Large
                </Label>
              </div>
            </RadioGroup>
          </div>

          <p className="text-xs text-muted-foreground">
            Generates realistic fake data like users, products, posts, or companies.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate}>
            <Dices className="h-4 w-4 mr-2" />
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
