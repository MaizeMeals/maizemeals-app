import { Item } from "@/types/dining";
import { FilterState } from "@/components/locations/slug/filters/types";

/** Lowercase a-z only, for comparing DB labels to filter ids. */
export function normalizeDietaryTag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * For each selected filter id, item tags that satisfy it (OR within the list).
 * Heuristic: halal/kosher searches include veg/vegan as no meat; vegetarian includes vegan.
 */
const DIETARY_FILTER_SATISFIED_BY: Record<string, readonly string[]> = {
  halal: ["halal", "vegetarian", "vegan"],
  kosher: ["kosher", "vegetarian", "vegan"],
  vegetarian: ["vegetarian", "vegan"],
  vegan: ["vegan"],
  glutenfree: ["glutenfree"],
  spicy: ["spicy"],
  highprotein: ["highprotein"],
  highfiber: ["highfiber"],
};

function itemSatisfiesDietaryFilter(
  itemTags: Set<string>,
  normalizedFilter: string,
): boolean {
  const satisfying = DIETARY_FILTER_SATISFIED_BY[normalizedFilter];
  if (satisfying) {
    return satisfying.some((t) => itemTags.has(t));
  }
  return itemTags.has(normalizedFilter);
}

/**
 * Shared dietary gate for every surface that recommends or displays menu food.
 * Selected filters use AND semantics; each individual filter may accept related
 * tags (for example, a vegan item also satisfies vegetarian).
 */
export function itemMatchesDietaryFilters(
  item: Item,
  selectedFilters: readonly string[],
): boolean {
  if (item.item_type === "station_header") return false;
  if (selectedFilters.length === 0) return true;

  const itemTags = new Set(getDynamicTags(item));
  return selectedFilters.every((filter) =>
    itemSatisfiesDietaryFilter(itemTags, normalizeDietaryTag(filter)),
  );
}

export const getDynamicTags = (item: Item): string[] => {
  const tags: string[] = [];

  // Get static tags from DB (e.g. "Vegan", "Halal")
  if (item.dietary_tags) {
    item.dietary_tags.forEach((tag) => {
      tags.push(normalizeDietaryTag(tag));
    });
  }

  // Get dynamic tags from Macros
  const macros = (item.macronutrients as Record<string, number>) || {};
  const cal = Number(macros["Calories"] || 0);
  const protein = Number(macros["Protein"] || 0);
  const fiber = Number(macros["Dietary Fiber"] || 0);

  if (cal > 0) {
    // Logic: High Protein if ratio >= 0.085 AND Cal >= 25
    if (cal >= 25 && protein / cal >= 0.085) {
      tags.push("highprotein");
    }
    // Logic: High Fiber if ratio >= 0.02
    if (fiber / cal >= 0.02) {
      tags.push("highfiber");
    }
  }

  return tags;
};

export function filterItems(items: Item[], filters: FilterState): Item[] {
  return items.filter((item) => {
    if (!itemMatchesDietaryFilters(item, filters.dietary)) return false;

    // 1. Search
    if (
      filters.search &&
      !item.name.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;

    // 2. Rating
    if (filters.minRating > 0 && (item.avg_rating || 0) < filters.minRating)
      return false;

    // 3. M-Scale
    if (
      filters.minMScale > 1 &&
      (item.nutrition_score || 0) < filters.minMScale
    )
      return false;

    // 4. Macro Ranges
    const macros = (item.macronutrients as Record<string, number>) || {};
    const cal = Number(macros["Calories"] || 0);
    const prot = Number(macros["Protein"] || 0);
    const carbs = Number(macros["Total Carbohydrate"] || 0);
    const fat = Number(macros["Total Fat"] || 0);

    if (cal < filters.macros.calories[0] || cal > filters.macros.calories[1])
      return false;
    if (prot < filters.macros.protein[0] || prot > filters.macros.protein[1])
      return false;
    if (carbs < filters.macros.carbs[0] || carbs > filters.macros.carbs[1])
      return false;
    if (fat < filters.macros.fat[0] || fat > filters.macros.fat[1])
      return false;

    return true;
  });
}
