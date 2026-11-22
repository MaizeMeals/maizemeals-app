import type { Item } from "@/types/dining";
import type { UserPreferences } from "@/types/preferences";
import { getDynamicTags, itemMatchesDietaryFilters } from "@/lib/filter-utils";
import { itemPreferenceScore } from "@/lib/preference-scoring";
import type { DayMenuHall, DayMenuItem } from "./types";

export type ScoringPrefs = Pick<
  UserPreferences,
  "dietary_filters" | "health_focus" | "protein_priority" | "rating_sensitivity" | "implicit_traits"
>;

/**
 * Adapt the compact payload to the shape the existing filter/scoring helpers
 * expect, so the menu page, /recommendations and the item view all share one
 * definition of "matches your dealbreakers" and "ranks higher for you".
 */
export function asScoringItem(it: DayMenuItem): Item {
  return {
    id: it.id,
    name: it.name,
    dining_hall_id: it.hallId,
    dietary_tags: it.tags,
    item_type: "food",
    nutrition_score: it.mScale,
    avg_rating: it.avgRating,
    review_count: it.reviewCount,
    station: it.station,
    serving_size: it.servingSize,
    macronutrients: {
      Calories: it.macros.calories,
      Protein: it.macros.protein,
      "Total Carbohydrate": it.macros.carbs,
      "Total Fat": it.macros.fat,
      "Dietary Fiber": it.macros.fiber,
      "Saturated Fat": it.macros.satFat,
      Sodium: it.macros.sodium,
      Sugars: it.macros.sugars,
    },
    normalized_name: it.key,
    is_mhealthy: null,
    created_at: null,
    updated_at: null,
    // Ingredients/label aren't in the day-menu payload; the item drawer loads
    // the full record (and shows "loading" until then).
    allergens: it.allergens.length ? it.allergens : null,
    ingredients: null,
    // Categories only (no spans): enough for the Avoid filters and row markers.
    ingredient_flags: it.additives.length ? { categories: it.additives, spans: [] } : null,
    ingredients_checked_at: null,
    label_notes: null,
    nutrition_label: it.labelMatch ? { source: { item_id: it.id, item_station: it.station, coverage: it.labelMatch.coverage, matched_at: it.labelMatch.matchedAt } } : null,
  };
}

export function passesFilters(it: DayMenuItem, filters: readonly string[]): boolean {
  return itemMatchesDietaryFilters(asScoringItem(it), filters);
}

export function preferenceScore(it: DayMenuItem, prefs: ScoringPrefs): number {
  return itemPreferenceScore(asScoringItem(it), prefs);
}

/**
 * Continuous 0–1 "how good a pick is this for you", weighted by the Smart
 * Preference sliders (unlike the threshold bonuses in itemPreferenceScore,
 * this still separates items when sliders sit at their defaults):
 *   protein  — grams, saturating at 30 g
 *   health   — M-Scale 1–6 (unscored items are slightly below neutral)
 *   rating   — crowd stars (unrated items are neutral)
 * Items the user eats often (MaizeMacros boosts) count as near-perfect fits.
 */
export function itemFit(it: DayMenuItem, prefs: ScoringPrefs): number {
  const P = Math.min(1, it.macros.protein / 30);
  const H = it.mScale ? (it.mScale - 1) / 5 : 0.4;
  const R = it.reviewCount > 0 ? (it.avgRating - 1) / 4 : 0.6;
  const wp = 0.25 + prefs.protein_priority / 100;
  const wh = 0.25 + prefs.health_focus / 100;
  const wr = 0.25 + prefs.rating_sensitivity / 100;
  const fit = (wp * P + wh * H + wr * R) / (wp + wh + wr);
  return prefs.implicit_traits.boosted_item_ids[it.id] ? Math.max(fit, 0.95) : fit;
}

export function itemTags(it: DayMenuItem): string[] {
  return getDynamicTags(asScoringItem(it));
}

// ---------------------------------------------------------------------------
// Time / meal helpers (all Eastern time, "HH:MM[:SS]" strings)
// ---------------------------------------------------------------------------

export function easternToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function easternDate(offsetDays: number, now = new Date()): string {
  const [y, m, d] = easternToday(now).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays, 12));
  return dt.toISOString().slice(0, 10);
}

/** Minutes since midnight, Eastern. */
export function easternMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** [start, end) in minutes; shifts ending at/after midnight end on the next day. */
export function shiftRange(shift: { start: string; end: string }): [number, number] {
  const s = toMinutes(shift.start);
  let e = toMinutes(shift.end);
  if (e <= s) e += 24 * 60;
  return [s, e];
}

const STANDARD_MEALS = ["Breakfast", "Brunch", "Lunch", "Dinner", "Late Night"];

/** operating_hours.event_name → menu_events.meal (scraper maps the rest to "All Day"). */
export function mealForShift(shiftName: string): string {
  const title = shiftName
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return STANDARD_MEALS.includes(title) ? title : "All Day";
}

export type ShiftState =
  | { kind: "open"; shift: DayMenuHall["hours"][number]; meal: string; minutesLeft: number }
  | { kind: "upcoming"; shift: DayMenuHall["hours"][number]; meal: string; minutesUntil: number }
  | { kind: "closed" };

/** The shift happening now, else the next one today, else closed. */
export function currentOrNextShift(hall: DayMenuHall, nowMinutes: number): ShiftState {
  let next: { shift: DayMenuHall["hours"][number]; start: number } | null = null;
  for (const shift of hall.hours) {
    const [s, e] = shiftRange(shift);
    if (nowMinutes >= s && nowMinutes < e) {
      return { kind: "open", shift, meal: mealForShift(shift.name), minutesLeft: e - nowMinutes };
    }
    if (s > nowMinutes && (!next || s < next.start)) next = { shift, start: s };
  }
  if (next) {
    return {
      kind: "upcoming",
      shift: next.shift,
      meal: mealForShift(next.shift.name),
      minutesUntil: next.start - nowMinutes,
    };
  }
  return { kind: "closed" };
}

/** The meal most people mean by "now" — used as the item view's default tab. */
export function defaultMealForNow(nowMinutes: number, isWeekend: boolean): string {
  if (nowMinutes < 10 * 60 + 30) return isWeekend ? "Brunch" : "Breakfast";
  if (nowMinutes < 16 * 60 + 30) return isWeekend ? "Brunch" : "Lunch";
  return "Dinner";
}

export function formatClock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}
