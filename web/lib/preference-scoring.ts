import type { Item } from "@/types/dining";
import type { UserPreferences } from "@/types/preferences";
import { getDynamicTags } from "@/lib/filter-utils";

type PrefsSlice = Pick<
  UserPreferences,
  "health_focus" | "protein_priority" | "rating_sensitivity"
>;

/**
 * Higher scores surface first when sorting. `rating_sensitivity` only affects this ordering
 * (not hard filtering): low = weak rating influence, high = strongly favor better-rated items.
 */
export function itemPreferenceScore(item: Item, prefs: PrefsSlice): number {
  const hf = prefs.health_focus / 100;
  const pp = prefs.protein_priority / 100;
  const rs = Math.min(100, Math.max(0, prefs.rating_sensitivity)) / 100;

  const mNorm = (item.nutrition_score ?? 0) / 6;
  const tags = getDynamicTags(item);
  const hasHighProtein = tags.includes("highprotein");

  const macros = (item.macronutrients as Record<string, number>) || {};
  const cal = Number(macros["Calories"] || 0);
  const protein = Number(macros["Protein"] || 0);
  const proteinRatio = cal > 0 ? Math.min(protein / cal / 0.12, 1) : 0;

  const nutritionPart = hf * mNorm * 100;
  const proteinPart =
    pp * (hasHighProtein ? 40 : 0) + pp * proteinRatio * 60;

  const rating = item.avg_rating ?? 0;
  const ratingWeight = 2 + 68 * rs;
  const ratingPart = rating * ratingWeight;

  return nutritionPart + proteinPart + ratingPart;
}

export function compareItemsBySmartPreferences(
  a: Item,
  b: Item,
  prefs: PrefsSlice,
): number {
  const da = itemPreferenceScore(a, prefs);
  const db = itemPreferenceScore(b, prefs);
  if (db !== da) return db - da;
  return a.name.localeCompare(b.name);
}
