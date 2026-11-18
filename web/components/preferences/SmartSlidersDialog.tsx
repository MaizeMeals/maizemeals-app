"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="pr-8">Smart preferences</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Tune how we rank items on this menu. Changes apply right away.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-8">
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
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
