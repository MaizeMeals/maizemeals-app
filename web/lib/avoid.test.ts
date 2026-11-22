import { describe, expect, it } from "vitest";
import { fromWire, type DayMenuWire } from "./day-menu/wire";
import { asScoringItem } from "./day-menu/scoring";
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
  item({ ingredients: "x", allergens, ingredient_flags: { source_item_id: "i", categories, spans: [] } });

describe("itemPassesAvoid", () => {
  it("passes everything when nothing is avoided", () => {
    expect(itemPassesAvoid(known(["Milk"], ["seed_oil"]), { allergens: [], additives: [], hide_unknown: true })).toBe(true);
  });

  it("blocks avoided allergens; Gluten also blocks Wheat", () => {
    const avoid = { allergens: ["Gluten"], additives: [], hide_unknown: false };
    expect(itemPassesAvoid(known(["Wheat"], []), avoid)).toBe(false);
    expect(itemPassesAvoid(known(["Milk"], []), avoid)).toBe(true);
  });

  it.each([true, false])("blocks explicit allergens on partial labels (hide unknown = %s)", (hide_unknown) => {
    expect(itemPassesAvoid(item({ allergens: ["Wheat"] }), { allergens: ["Gluten"], additives: [], hide_unknown })).toBe(false);
  });

  it("keeps unmatched legacy labels unknown, including labels copied from another item", () => {
    const avoid = { allergens: ["Milk"], additives: [], hide_unknown: true };
    expect(itemPassesAvoid(item({ ingredients: "rice" }), avoid)).toBe(false);
    expect(itemPassesAvoid(item({ ingredient_flags: { source_item_id: "other" } }), avoid)).toBe(false);
    expect(itemPassesAvoid(known([], []), avoid)).toBe(true);
  });

  it("retains listed allergens from cached menus without trusting the legacy known bit", () => {
    const wire: DayMenuWire = {
      v: 4, date: "2026-11-22", generatedAt: "", halls: [{ id: "h", name: "Hall", slug: "hall", type: null, imageUrl: null, hours: [] }],
      items: [["i", 0, "Soup", null, [], [0, 0, 0, 0, 0], null, 0, 0, ["Dinner"], null, ["Milk"], [], 1]],
    };
    const soup = asScoringItem(fromWire(wire).items[0]);
    expect(itemPassesAvoid(soup, { allergens: ["Milk"], additives: [], hide_unknown: false })).toBe(false);
    expect(itemPassesAvoid(soup, { allergens: ["Soy"], additives: [], hide_unknown: true })).toBe(false);
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
    const findFood = item({ allergens: [], ingredient_flags: { source_item_id: "i", categories: ["seed_oil"], spans: [] } });
    expect(itemPassesAvoid(findFood, { allergens: [], additives: ["seed_oil"], hide_unknown: true })).toBe(false);
  });
});
