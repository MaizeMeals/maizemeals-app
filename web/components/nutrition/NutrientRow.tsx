import { ADDITIVE_CATEGORIES, sortCategories } from "@/lib/ingredients";
import { EXTRA_NUTRIENT_LIMITS, type ExtraNutrients } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Fiber / sugar / sodium / sat fat for the day, plus what additives the day's food had. */
export function NutrientRow({
  totals,
  additiveCounts,
}: {
  totals: ExtraNutrients;
  /** category -> number of logged items containing it */
  additiveCounts: Record<string, number>;
}) {
  const sodiumHigh = totals.sodium > EXTRA_NUTRIENT_LIMITS.sodium;
  const satHigh = totals.satFat > EXTRA_NUTRIENT_LIMITS.satFat;
  const categories = sortCategories(Object.keys(additiveCounts));

  return (
    <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
      <p className="tabular-nums">
        Fiber {fmt(totals.fiber)}g · Sugar {fmt(totals.sugar)}g ·{" "}
        <span
          className={cn(sodiumHigh && "font-medium text-orange-600 dark:text-orange-400")}
          title={`Daily reference: ${fmt(EXTRA_NUTRIENT_LIMITS.sodium)}mg`}
        >
          Sodium {fmt(totals.sodium)}mg
        </span>{" "}
        ·{" "}
        <span
          className={cn(satHigh && "font-medium text-orange-600 dark:text-orange-400")}
          title={`Daily reference: ${EXTRA_NUTRIENT_LIMITS.satFat}g`}
        >
          Sat fat {fmt(totals.satFat)}g
        </span>
      </p>
      {categories.length ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-medium text-foreground">In today&apos;s food:</span>
          {categories.map((c) => (
            <span key={c} className="inline-flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", ADDITIVE_CATEGORIES[c].dot)} aria-hidden />
              {ADDITIVE_CATEGORIES[c].label} ({additiveCounts[c]})
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
