"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
const OPTIONS: { id: string; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "glutenfree", label: "Gluten-Free" },
];

type DietaryEssentialsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dietaryFilters: string[];
  onSave: (filters: string[]) => void | Promise<void>;
};

export function DietaryEssentialsSheet({
  open,
  onOpenChange,
  dietaryFilters,
  onSave,
}: DietaryEssentialsSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(dietaryFilters),
  );

  useEffect(() => {
    if (open) setSelected(new Set(dietaryFilters));
  }, [open, dietaryFilters]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    await onSave([...selected]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 max-h-[90dvh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader className="text-left space-y-2 px-1">
          <SheetTitle className="text-xl font-bold pr-10">
            Any absolute dealbreakers?
          </SheetTitle>
          <SheetDescription>
            We&apos;ll hide menu items that don&apos;t match. You can change this
            anytime in filters.
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 mt-6">
          {OPTIONS.map(({ id, label }) => {
            const on = selected.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={cn(
                  "min-h-[52px] rounded-xl border-2 px-4 py-3 text-base font-semibold transition-colors",
                  on
                    ? "border-maize bg-maize/20 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <SheetFooter className="mt-8 flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className={cn("w-full h-12 text-base", appPrimaryButtonClassName)}
            onClick={handleSave}
          >
            Continue
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
