"use client";

import type { ChangeEvent } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BUTTON =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-within:ring-1 focus-within:ring-ring";

/**
 * "Take photo" opens the phone camera directly (capture="environment");
 * "Choose photo" opens the library. The camera button only shows on touch
 * devices, where `capture` does something.
 */
export function PhotoSourceButtons({
  onChange,
  disabled,
  busy,
  chooseLabel = "Choose photo",
}: {
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  busy?: boolean;
  chooseLabel?: string;
}) {
  const off = disabled || busy;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={cn(BUTTON, "pointer-fine:hidden", off && "pointer-events-none opacity-60")}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Take photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onChange}
          disabled={off}
        />
      </label>
      <label className={cn(BUTTON, off && "pointer-events-none opacity-60")}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? "Compressing…" : chooseLabel}
        <input type="file" accept="image/*" className="sr-only" onChange={onChange} disabled={off} />
      </label>
    </div>
  );
}
