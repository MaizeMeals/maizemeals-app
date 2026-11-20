import { buildDishes, mealsOnMenu, type Offering } from "@/lib/day-menu/dishes";
import type { ScoringPrefs } from "@/lib/day-menu/scoring";
import { itemFit } from "@/lib/day-menu/scoring";
import type { DayMenu, DayMenuItem } from "@/lib/day-menu/types";
import type { MacroSummary } from "@/lib/nutrition";

export type MacroSuggestion = {
  offering: Offering;
  calories: number;
  protein: number;
  /** One line, e.g. "Covers 32 of your 45g protein left". */
  reason: string;
};

/** Smallest dish worth suggesting as a meal (skips sauces, sides, condiments). */
const MIN_MEAL_CALORIES = 150;

/**
 * Dishes still being served today that fit what's left of the user's targets:
 * prefers dishes that cover the remaining protein without blowing past the
 * remaining calories, then Smart Preferences (health / ratings / favorites).
 */
export function suggestForRemaining(
  menu: DayMenu,
  remaining: MacroSummary,
  prefs: ScoringPrefs,
  opts: { nowMinutes: number | null; include: (item: DayMenuItem) => boolean; mealsLeft?: number; limit?: number },
): MacroSuggestion[] {
  if (remaining.calories < MIN_MEAL_CALORIES) return [];
  const limit = opts.limit ?? 5;
  // Aim one meal's share of what's left (at least the whole rest for the last meal).
  const mealsLeft = Math.max(1, opts.mealsLeft ?? 1);
  const targetCalories = Math.max(MIN_MEAL_CALORIES, remaining.calories / mealsLeft);
  const wantsProtein = remaining.protein > 10;

  const best = new Map<string, { s: MacroSuggestion; score: number }>();
  for (const meal of mealsOnMenu(menu, true)) {
    const dishes = buildDishes(menu, prefs, {
      query: "",
      meal,
      include: opts.include,
      includeRetail: true,
      nowMinutes: opts.nowMinutes,
    });
    for (const dish of dishes) {
      for (const offering of dish.offerings) {
        if (offering.status.kind === "ended") continue;
        const { calories, protein } = offering.item.macros;
        if (calories < MIN_MEAL_CALORIES) continue;
        if (calories > remaining.calories + 100) continue;

        const proteinCover = wantsProtein ? Math.min(1, protein / remaining.protein) : 0.5;
        const calorieFit = Math.max(0, 1 - Math.abs(calories - targetCalories) / targetCalories);
        const soon = offering.status.kind === "now" ? 1 : 0.8;
        const score = (0.45 * proteinCover + 0.3 * calorieFit + 0.25 * itemFit(offering.item, prefs)) * soon;

        const prev = best.get(dish.key);
        if (prev && prev.score >= score) continue;
        const reason = wantsProtein
          ? `Covers ${Math.round(Math.min(protein, remaining.protein))} of your ${Math.round(remaining.protein)}g protein left`
          : `${Math.round(calories)} of your ${Math.round(remaining.calories)} calories left`;
        best.set(dish.key, { s: { offering, calories, protein, reason }, score });
      }
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}
