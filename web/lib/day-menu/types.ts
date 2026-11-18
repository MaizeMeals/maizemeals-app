/**
 * Compact, public "everything served on a date" payload shared by the item
 * view (/menus) and the Hall Match Score. Built server-side once per date
 * (lib/day-menu/server.ts) and personalized on the client, so guests (whose
 * preferences live in localStorage) and signed-in users rank the same way.
 */

export type DayMenuHall = {
  id: string;
  name: string;
  slug: string;
  /** Raw dining_halls.type: "DINING HALLS" | "CAFES" | "MARKETS" | "GRILLS" */
  type: string | null;
  imageUrl: string | null;
  /** Shifts for the date, sorted by start time. Times are "HH:MM:SS" Eastern. */
  hours: { name: string; start: string; end: string }[];
};

export type DayMenuItem = {
  /** items.id — location-specific (a Bursley cookie ≠ a Mojo cookie). */
  id: string;
  hallId: string;
  name: string;
  /** Grouping key for "the same dish" across halls. */
  key: string;
  station: string | null;
  tags: string[];
  servingSize: string | null;
  /** Subset of macronutrients used for display + scoring. */
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    satFat: number;
    sodium: number;
    sugars: number;
  };
  /** M-Scale (1–6), null when unscored. */
  mScale: number | null;
  avgRating: number;
  reviewCount: number;
  /** menu_events.meal values this item is served at on the date. */
  meals: string[];
  /** Normalized allergens from NetNutrition ("Milk", "Wheat", ...). */
  allergens: string[];
  /** Additive highlight categories present in the ingredients ("seed_oil", ...). */
  additives: string[];
};

export type DayMenu = {
  date: string;
  generatedAt: string;
  halls: DayMenuHall[];
  items: DayMenuItem[];
};

/** POST /menus/favorites → next time (within a week) a favorite is served. */
export type UpcomingFavorite = {
  key: string;
  name: string;
  date: string;
  meal: string;
  halls: { name: string; slug: string; itemId: string }[];
};

export const MEAL_ORDER = ["Breakfast", "Brunch", "Lunch", "Dinner", "Late Night", "All Day"] as const;

export function mealRank(meal: string): number {
  const i = (MEAL_ORDER as readonly string[]).indexOf(meal);
  return i === -1 ? MEAL_ORDER.length : i;
}

/** Same normalization for the server key and client-side favorites. */
export function foodKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
