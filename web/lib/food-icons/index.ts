import data from "./rules.json";
import { foodKey } from "@/lib/day-menu/types";

/**
 * Dish name → Fluent Emoji food icon (public/icons/food/<icon>.svg).
 *
 * rules.json holds ordered name patterns (first match wins: specific dishes
 * before ingredients, so "Chicken Pizza" is pizza) plus per-dish overrides
 * keyed by foodKey(name). Both were checked against every dish name in the
 * database; new dishes fall through the same rules, and anything unmatched
 * gets the plate icon.
 */
export const DEFAULT_FOOD_ICON = "fork-and-knife-with-plate";

const RULES: [RegExp, string][] = (data.rules as [string, string][]).map(([pattern, icon]) => [
  new RegExp(pattern, "i"),
  icon,
]);
const OVERRIDES = data.overrides as Record<string, string>;
const cache = new Map<string, string>();

export function foodIconFor(name: string | null | undefined): string {
  if (!name) return DEFAULT_FOOD_ICON;
  const hit = cache.get(name);
  if (hit) return hit;
  let icon = OVERRIDES[foodKey(name)];
  if (!icon) icon = RULES.find(([re]) => re.test(name))?.[1] ?? DEFAULT_FOOD_ICON;
  cache.set(name, icon);
  return icon;
}

export function foodIconSrc(name: string | null | undefined): string {
  return `/icons/food/${foodIconFor(name)}.svg`;
}
