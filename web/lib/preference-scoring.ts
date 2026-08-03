import type { Item } from "@/types/dining";
import type { UserPreferences } from "@/types/preferences";

type PrefsSlice = Pick<
  UserPreferences,
  | "health_focus"
  | "protein_priority"
  | "rating_sensitivity"
  | "implicit_traits"
>;

/**
 * Higher scores surface first when sorting. `rating_sensitivity` only affects this ordering
 * (not hard filtering): low = weak rating influence, high = strongly favor better-rated items.
 */
export function itemPreferenceScore(item: Item, prefs: PrefsSlice): number {
  let score = 50;
  const macros = (item.macronutrients as Record<string, number>) || {};
  const protein = Number(macros["Protein"] || 0);

  if (prefs.protein_priority > 70 && protein > 20) score += 15;
  if (prefs.health_focus > 70 && (item.nutrition_score ?? 0) > 4) score += 15;

  // Unrated food is neutral. Sensitivity 100 means ten score points per star
  // above/below 3, matching the approved example (4.5 stars => +15).
  const rating = (item.review_count ?? 0) > 0 ? (item.avg_rating ?? 3) : 3;
  score += (rating - 3) * (Math.min(100, Math.max(0, prefs.rating_sensitivity)) / 10);

  score += prefs.implicit_traits.boosted_item_ids[item.id] ?? 0;
  return score;
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
