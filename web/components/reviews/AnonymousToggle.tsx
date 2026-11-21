"use client";

import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const ANONYMOUS_PREF_KEY = "mm_review_anonymous";

export function readAnonymousPref(): boolean {
  try {
    return localStorage.getItem(ANONYMOUS_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAnonymousPref(value: boolean) {
  try {
    localStorage.setItem(ANONYMOUS_PREF_KEY, value ? "1" : "0");
  } catch {
    // Private mode / blocked storage: the choice just isn't remembered.
  }
}

/** "Post anonymously" checkbox shared by the new-review and edit dialogs. */
export function AnonymousToggle({
  checked,
  onChange,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm",
        checked && "border-maize/60 bg-maize/10",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--maize))]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <EyeOff className="h-3.5 w-3.5" aria-hidden /> Post anonymously
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Other students see &ldquo;Anonymous&rdquo; instead of your name.
        </span>
      </span>
    </label>
  );
}
