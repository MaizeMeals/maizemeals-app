"use client";

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdditiveMarker } from "@/components/ingredients/AdditiveMarker";
import { DietaryTag } from "@/components/locations/slug/DietaryTags";
import { MScaleIndicator } from "@/components/locations/slug/MScaleIndicator";
import { FavoriteButton } from "@/components/menus/FavoriteButton";
import { getDynamicTags } from "@/lib/filter-utils";
import { macroSummaryFromNutrition, roundMacro } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import { avoidCount, ingredientInfo } from "@/lib/avoid";
import { useAvoid } from "@/components/ingredients/avoid-context";
import type { Item } from "@/types/dining";

const TAG_ORDER = ["vegan", "vegetarian", "halal", "kosher", "glutenfree", "spicy", "highprotein", "highfiber"];

/** Dietary tags for a list card: no carbon tag (that lives in the drawer), fixed order. */
export function cardTags(item: Item): string[] {
  const tags = [...new Set(getDynamicTags(item))].filter((t) => !t.toLowerCase().startsWith("carbon"));
  const rank = (t: string) => (TAG_ORDER.includes(t) ? TAG_ORDER.indexOf(t) : TAG_ORDER.length);
  return tags.sort((a, b) => rank(a) - rank(b));
}

/**
 * The one item summary used by hall menu cards and Find food dish cards:
 *
 *   Name ♡                                   [M-Scale]
 *   ★ 4.2 (3)  [tags]  323 cal · 21g protein   [aside]
 *   ● Seed oil ● Food coloring +1
 */
export function ItemSummary({
  item,
  additives,
  rating,
  aside,
  className,
}: {
  item: Item;
  /** Additive categories (hall rows parse them from ingredient_flags). */
  additives: readonly string[] | null | undefined;
  /** Defaults to the item's own rating; Find food passes the best across halls. */
  rating?: { value: number; count?: number } | null;
  /** Right column under the M-Scale (e.g. quick add). */
  aside?: ReactNode;
  className?: string;
}) {
  const macros = macroSummaryFromNutrition(item.macronutrients);
  // Avoiding something and this dish has no label: say so instead of implying it's safe.
  const avoid = useAvoid();
  const unknownIngredients = avoidCount(avoid) > 0 && !ingredientInfo(item).known;
  const shownRating =
    rating !== undefined
      ? rating
      : item.avg_rating
        ? { value: item.avg_rating, count: item.review_count ?? undefined }
        : null;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="min-w-0 flex-1">
        {/* Heart flows after the last word, even when the name wraps. */}
        <div>
          <h3 className="type-card-title inline">{item.name}</h3>{" "}
          <FavoriteButton name={item.name} size="sm" className="-my-1 inline-flex align-middle" />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {shownRating ? (
            <Badge variant="maize-soft" className="gap-1 px-1.5 font-bold tabular-nums">
              <Star className="h-3 w-3 fill-maize text-maize" aria-hidden />
              {shownRating.value.toFixed(1)}
              {shownRating.count ? (
                <span className="font-normal text-muted-foreground">({shownRating.count})</span>
              ) : null}
            </Badge>
          ) : null}
          {cardTags(item).map((t) => (
            <DietaryTag key={t} tag={t} />
          ))}
          {macros.calories > 0 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {roundMacro(macros.calories)} cal
              {macros.protein > 0 ? ` · ${roundMacro(macros.protein)}g protein` : ""}
            </span>
          ) : null}
        </div>
        <AdditiveMarker categories={additives} className="mt-1.5" />
        {unknownIngredients ? (
          <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">Ingredients unknown</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <MScaleIndicator score={item.nutrition_score} />
        {aside}
      </div>
    </div>
  );
}
