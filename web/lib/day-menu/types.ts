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
  /** The ingredient label was matched to this item at its own location. */
  ingredientsKnown?: boolean;
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

/** Words in a dish name that say how it's served, not what it is. */
const SERVED_ON = /\s+(?:on|with)\s+(?:a\s+)?(?:[a-z0-9']+\s+){0,3}(?:bun|roll|bread|white|wheat)$/;
/** Dishes that always come on bread, so the bun type never changes the dish. */
const BREAD_IMPLIED = /\b(?:burger|hamburger|cheeseburger|slider|hot dog|hotdog|sandwich|patty|sloppy joe|grilled cheese|cheese steak|cheesesteak|brat|bratwurst|sub|hoagie)$/;

/**
 * Coarser key for grouping near-identical dishes in Find food:
 * "Beef & Mushroom Blended Burger w/ Cheese" and "Beef and Mushroom Blend
 * Burger w/ American" match; "... w/ Cheddar" does not. Ignores "&"/"and",
 * "blend"/"blended", "w/"/"with", plurals, plain American vs cheese, and the
 * bun or bread a dish is served on.
 */
export function dishGroupKey(name: string): string {
  let key = foodKey(name)
    .split(" ")
    .filter((w) => w !== "and")
    .map((w) => (w === "w" ? "with" : w === "blended" ? "blend" : w))
    // Singular forms (key only): tenders/tender, vegetables/vegetable.
    .map((w) => (w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w))
    .join(" ");
  key = key.replace(/\bamerican(?: cheese)?\b/g, "cheese");
  if (SERVED_ON.test(key)) {
    const base = key.replace(SERVED_ON, "").trim();
    // A burger on a white or wheat bun is still the burger. "BBQ Chicken" on a
    // bun is a sandwich, not the entree: those only merge with other buns.
    key = BREAD_IMPLIED.test(base) ? base : `${base} on bun`;
  }
  return key.trim() || foodKey(name);
}

/** "Black Bean Burger w/ White Bun" → "Black Bean Burger" (bread-implied dishes only). */
export function dishDisplayName(name: string): string {
  const trimmed = name.trim();
  const stripped = trimmed.replace(/\s+(?:on|with|w\/)\s+(?:a\s+)?(?:[\w']+\s+){0,3}(?:bun|roll|bread|white|wheat)$/i, "");
  return stripped !== trimmed && BREAD_IMPLIED.test(foodKey(stripped)) ? stripped : trimmed;
}
