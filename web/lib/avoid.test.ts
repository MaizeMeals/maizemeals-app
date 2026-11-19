import { describe, expect, it } from "vitest";
import { itemPassesAvoid } from "./avoid";
import type { Item } from "@/types/dining";

function item(overrides: Partial<Item>): Item {
  return {
    id: "i",
    name: "Dish",
    dining_hall_id: "h",
    dietary_tags: [],
    item_type: "food",
    nutrition_score: null,
    avg_rating: null,
    review_count: null,
    station: null,
    serving_size: null,
    macronutrients: {},
    normalized_name: "dish",
    is_mhealthy: null,
    created_at: null,
    updated_at: null,
    allergens: null,
    ingredients: null,
    ingredient_flags: null,
    ingredients_checked_at: null,
    label_notes: null,
    nutrition_label: null,
    ...overrides,
  } as Item;
}

const known = (allergens: string[], categories: string[]) =>
  item({ ingredients: "x", allergens, ingredient_flags: { categories, spans: [] } });

describe("itemPassesAvoid", () => {
  it("passes everything when nothing is avoided", () => {
    expect(itemPassesAvoid(known(["Milk"], ["seed_oil"]), { allergens: [], additives: [], hide_unknown: true })).toBe(true);
  });

  it("blocks avoided allergens; Gluten also blocks Wheat", () => {
    const avoid = { allergens: ["Gluten"], additives: [], hide_unknown: false };
    expect(itemPassesAvoid(known(["Wheat"], []), avoid)).toBe(false);
    expect(itemPassesAvoid(known(["Milk"], []), avoid)).toBe(true);
  });

  it("blocks avoided additive categories", () => {
    const avoid = { allergens: [], additives: ["seed_oil"], hide_unknown: false };
    expect(itemPassesAvoid(known([], ["seed_oil", "color"]), avoid)).toBe(false);
    expect(itemPassesAvoid(known([], ["color"]), avoid)).toBe(true);
  });

  it("keeps unknown-ingredient dishes unless hide_unknown", () => {
    const unknown = item({});
    expect(itemPassesAvoid(unknown, { allergens: ["Milk"], additives: [], hide_unknown: false })).toBe(true);
    expect(itemPassesAvoid(unknown, { allergens: ["Milk"], additives: [], hide_unknown: true })).toBe(false);
  });

  it("treats Find food items (flags without text) as known", () => {
    const findFood = item({ allergens: [], ingredient_flags: { categories: ["seed_oil"], spans: [] } });
    expect(itemPassesAvoid(findFood, { allergens: [], additives: ["seed_oil"], hide_unknown: true })).toBe(false);
  });
});
