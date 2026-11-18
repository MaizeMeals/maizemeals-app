"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoriteFoods } from "@/hooks/use-favorite-foods";
import { useAnalytics } from "@/hooks/use-analytics";
import { foodKey } from "@/lib/day-menu/types";

/**
 * Heart toggle for a dish. Favorites are by dish name, so saving it here
 * saves it at every location that serves it.
 */
export function FavoriteButton({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { isFavorite, toggle } = useFavoriteFoods();
  const { track } = useAnalytics();
  const key = foodKey(name);
  const on = isFavorite(key);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
      title={on ? "Saved to favorites" : "Save to favorites"}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        track("favorite_food_toggled", { food_key: key, favorited: !on });
        void toggle(key, name);
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        on ? "text-red-500" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Heart className={cn(size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]", on && "fill-current")} aria-hidden />
    </button>
  );
}
