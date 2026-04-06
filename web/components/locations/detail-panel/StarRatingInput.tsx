"use client";

import { useState, useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  className?: string;
};

export function StarRatingInput({ value, onChange, disabled, className }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  const handleClick = useCallback(
    (rating: number) => {
      if (disabled) return;
      onChange(rating);
    },
    [disabled, onChange]
  );

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="group"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          className={cn(
            "p-0.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            disabled && "cursor-not-allowed opacity-70"
          )}
          onMouseEnter={() => !disabled && setHover(i)}
          onMouseLeave={() => setHover(null)}
          onClick={() => handleClick(i)}
          aria-label={`${i} star${i === 1 ? "" : "s"}`}
          aria-pressed={value === i}
        >
          <Star
            className={cn(
              "w-8 h-8 transition-colors",
              i <= display
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}
