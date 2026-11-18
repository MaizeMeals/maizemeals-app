import { describe, expect, it } from "vitest";
import type { Item } from "@/types/dining";
import { itemMatchesDietaryFilters } from "./filter-utils";

function makeItem(overrides: Partial<Item> & Pick<Item, "id" | "name">): Item {
  return {
    avg_rating: null,
    created_at: null,
    dietary_tags: null,
    dining_hall_id: "hall-1",
    is_mhealthy: null,
    item_type: "food",
    macronutrients: null,
    normalized_name: null,
    nutrition_score: null,
    review_count: 0,
    serving_size: null,
    station: null,
    updated_at: null,
    ...overrides,
  };
}

describe("itemMatchesDietaryFilters", () => {
  const vegetarian = makeItem({
    id: "veg",
    name: "Garden Pasta",
    dietary_tags: ["Vegetarian"],
  });
  const vegan = makeItem({
    id: "vegan",
    name: "Tofu Bowl",
    dietary_tags: ["Vegan"],
  });
  const halal = makeItem({
    id: "halal",
    name: "Halal Chicken",
    dietary_tags: ["Halal"],
  });
  const kosher = makeItem({
    id: "kosher",
    name: "Kosher Wrap",
    dietary_tags: ["Kosher"],
  });
  const veganHalal = makeItem({
    id: "both",
    name: "Halal Tofu",
    dietary_tags: ["Vegan", "Halal"],
  });

  it("matches halal only when the item is tagged halal", () => {
    expect(itemMatchesDietaryFilters(halal, ["halal"])).toBe(true);
    expect(itemMatchesDietaryFilters(vegetarian, ["halal"])).toBe(false);
    expect(itemMatchesDietaryFilters(vegan, ["halal"])).toBe(false);
  });

  it("matches kosher only when the item is tagged kosher", () => {
    expect(itemMatchesDietaryFilters(kosher, ["kosher"])).toBe(true);
    expect(itemMatchesDietaryFilters(vegetarian, ["kosher"])).toBe(false);
    expect(itemMatchesDietaryFilters(vegan, ["kosher"])).toBe(false);
  });

  it("treats vegan as satisfying vegetarian", () => {
    expect(itemMatchesDietaryFilters(vegetarian, ["vegetarian"])).toBe(true);
    expect(itemMatchesDietaryFilters(vegan, ["vegetarian"])).toBe(true);
  });

  it("does not treat vegetarian as satisfying vegan", () => {
    expect(itemMatchesDietaryFilters(vegan, ["vegan"])).toBe(true);
    expect(itemMatchesDietaryFilters(vegetarian, ["vegan"])).toBe(false);
  });

  it("requires every selected filter (AND)", () => {
    expect(itemMatchesDietaryFilters(veganHalal, ["vegan", "halal"])).toBe(true);
    expect(itemMatchesDietaryFilters(vegan, ["vegan", "halal"])).toBe(false);
    expect(itemMatchesDietaryFilters(halal, ["vegan", "halal"])).toBe(false);
  });
});
