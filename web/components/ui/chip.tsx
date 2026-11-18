"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Pill toggle for filters and quick picks (Radix Toggle → `aria-pressed`).
 * Use `variant="brand"` for app-level choices (day pickers, "include cafés"),
 * and pass color classes via `selectedClassName` for semantic chips such as
 * dietary filters.
 */
const chipVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border font-semibold transition-colors",
    "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Maize tint when on. */
        default: "data-[state=on]:border-maize data-[state=on]:bg-maize/20 data-[state=on]:text-foreground",
        /** Solid brand when on (blue in light, maize in dark). */
        brand:
          "data-[state=on]:border-umich-blue data-[state=on]:bg-umich-blue data-[state=on]:text-white dark:data-[state=on]:border-maize dark:data-[state=on]:bg-maize dark:data-[state=on]:text-umich-blue",
      },
      size: {
        sm: "h-7 px-3 text-[11px]",
        default: "h-8 px-3 text-xs",
        lg: "h-9 px-4 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ChipProps
  extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>,
    VariantProps<typeof chipVariants> {
  /** Extra classes applied only while pressed (e.g. semantic colors). */
  selectedClassName?: string;
}

const Chip = React.forwardRef<React.ElementRef<typeof TogglePrimitive.Root>, ChipProps>(
  ({ className, variant, size, selectedClassName, pressed, ...props }, ref) => (
    <TogglePrimitive.Root
      ref={ref}
      pressed={pressed}
      className={cn(chipVariants({ variant, size }), pressed && selectedClassName, className)}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
