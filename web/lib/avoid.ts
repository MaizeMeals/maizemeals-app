import type { Item } from "@/types/dining";
import type { UserPreferences } from "@/types/preferences";
import { ADDITIVE_CATEGORIES, type AdditiveCategory } from "@/lib/ingredients";

export type AvoidPrefs = UserPreferences["avoid_ingredients"];

export const NO_AVOID: AvoidPrefs = { allergens: [], additives: [], hide_unknown: false };

/** Avoid chips → allergen labels written by the scraper (split_allergens). */
export const AVOID_ALLERGENS: { id: string; label: string; matches: readonly string[] }[] = [
  { id: "Milk", label: "Milk", matches: ["Milk"] },
  { id: "Egg", label: "Egg", matches: ["Egg"] },
  // Gluten covers wheat (and barley/rye, which the scraper already maps to Gluten).
  { id: "Gluten", label: "Gluten / wheat", matches: ["Gluten", "Wheat"] },
  { id: "Soy", label: "Soy", matches: ["Soy"] },
  { id: "Peanuts", label: "Peanuts", matches: ["Peanuts"] },
  { id: "Tree nuts", label: "Tree nuts", matches: ["Tree nuts", "Coconut"] },
  { id: "Sesame", label: "Sesame", matches: ["Sesame"] },
  { id: "Fish", label: "Fish", matches: ["Fish"] },
  { id: "Shellfish", label: "Shellfish", matches: ["Shellfish"] },
];

/** Every highlight category except the catch-all. */
export const AVOID_ADDITIVES = (Object.keys(ADDITIVE_CATEGORIES) as AdditiveCategory[]).filter(
  (c) => c !== "other",
);

export function avoidCount(avoid: AvoidPrefs | null | undefined): number {
  if (!avoid) return 0;
  return avoid.allergens.length + avoid.additives.length;
}

/** What we know about an item's ingredients (hall rows and Find food items alike). */
export function ingredientInfo(item: Item): { known: boolean; allergens: string[]; additives: string[] } {
  const flags = item.ingredient_flags as { source_item_id?: string; categories?: unknown } | null;
  const known = flags?.source_item_id === item.id;
  const additives = Array.isArray(flags?.categories) ? (flags.categories as string[]) : [];
  return { known, allergens: item.allergens ?? [], additives };
}

/**
 * false when the item contains something the user avoids. Items without
 * ingredient data pass unless the user also chose "hide unknown".
 */
export function itemPassesAvoid(item: Item, avoid: AvoidPrefs | null | undefined): boolean {
  if (!avoid || avoidCount(avoid) === 0) return true;
  const info = ingredientInfo(item);
  const blockedAllergens = new Set(
    AVOID_ALLERGENS.filter((a) => avoid.allergens.includes(a.id)).flatMap((a) => a.matches),
  );
  if (info.allergens.some((a) => blockedAllergens.has(a))) return false;
  if (info.additives.some((c) => avoid.additives.includes(c))) return false;
  return info.known || !avoid.hide_unknown;
}
