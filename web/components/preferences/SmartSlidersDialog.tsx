"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  appPrimaryButtonClassName,
  appDialogMutedOutlineButtonClassName,
} from "@/lib/button-styles";
import { cn } from "@/lib/utils";

type SmartSlidersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  healthFocus: number;
  proteinPriority: number;
  ratingSensitivity: number;
  onSave: (values: {
    health_focus: number;
    protein_priority: number;
    rating_sensitivity: number;
  }) => void | Promise<void>;
};

function SliderRow({
  label,
  left,
  right,
  value,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2 text-sm font-semibold text-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        max={100}
        step={1}
        className="py-1"
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

export function SmartSlidersDialog({
  open,
  onOpenChange,
  healthFocus,
  proteinPriority,
  ratingSensitivity,
  onSave,
}: SmartSlidersDialogProps) {
  const [hf, setHf] = useState(healthFocus);
  const [pp, setPp] = useState(proteinPriority);
  const [rs, setRs] = useState(ratingSensitivity);

  useEffect(() => {
    if (open) {
      setHf(healthFocus);
      setPp(proteinPriority);
      setRs(ratingSensitivity);
    }
  }, [open, healthFocus, proteinPriority, ratingSensitivity]);

  const handleSave = async () => {
    await onSave({
      health_focus: hf,
      protein_priority: pp,
      rating_sensitivity: rs,
    });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex max-h-[min(90dvh,640px)] w-[min(calc(100vw-1.5rem),420px)] translate-x-[-50%] translate-y-[-50%] flex-col rounded-xl border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex flex-col gap-1 border-b border-border px-4 py-3 shrink-0">
            <Dialog.Title className="text-lg font-bold pr-8">
              Smart preferences
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Tune how we rank items on this menu. Changes apply right away.
            </Dialog.Description>
            <Dialog.Close className="absolute right-3 top-3 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-8">
            <SliderRow
              label="Health focus"
              left="Comfort food"
              right="Strict nutrition"
              value={hf}
              onChange={setHf}
            />
            <SliderRow
              label="Protein priority"
              left="Balanced"
              right="High protein"
              value={pp}
              onChange={setPp}
            />
            <SliderRow
              label="Rating sensitivity"
              left="Ignore ratings"
              right="Favor top-rated"
              value={rs}
              onChange={setRs}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              className={cn(appDialogMutedOutlineButtonClassName)}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(appPrimaryButtonClassName, "sm:min-w-[120px]")}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
