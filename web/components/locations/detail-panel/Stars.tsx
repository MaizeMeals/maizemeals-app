import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  rating: number;
  className?: string;
};

const STAR_INDICES = [0, 1, 2, 3, 4] as const;

/**
 * Five stars in a row: outlines for empty capacity, each star filled left-to-right
 * by the fractional part of the rating (e.g. 3.4 → three full + fourth at 40%).
 */
export function Stars({ rating, className }: Props) {
  const safe = Math.min(5, Math.max(0, rating));

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${safe.toFixed(1)} out of 5 stars`}
    >
      {STAR_INDICES.map((i) => {
        const fill = Math.min(1, Math.max(0, safe - i));
        return (
          <div
            key={i}
            className="relative h-3.5 w-3.5 shrink-0"
            aria-hidden
          >
            <Star
              className="h-3.5 w-3.5 text-muted-foreground/45"
              strokeWidth={1.5}
              fill="none"
            />
            {fill > 0 ? (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="h-3.5 w-3.5 fill-maize text-maize" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
