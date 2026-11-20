import { describe, expect, it } from "vitest";
import { suggestForRemaining } from "./nutrition-suggest";
import type { DayMenu, DayMenuItem } from "@/lib/day-menu/types";
import type { ScoringPrefs } from "@/lib/day-menu/scoring";

const PREFS: ScoringPrefs = {
  dietary_filters: [],
  health_focus: 50,
  protein_priority: 50,
  rating_sensitivity: 50,
  implicit_traits: { boosted_item_ids: {}, avoid_tags: [] },
};

function item(id: string, name: string, calories: number, protein: number): DayMenuItem {
  return {
    id, hallId: "h", name, key: name.toLowerCase(), station: null, tags: [], servingSize: null,
    macros: { calories, protein, carbs: 30, fat: 10, fiber: 2, satFat: 2, sodium: 300, sugars: 4 },
    mScale: 3, avgRating: 0, reviewCount: 0, meals: ["Dinner"], allergens: [], additives: [],
  };
}

const menu: DayMenu = {
  date: "2026-11-20",
  generatedAt: "",
  halls: [{ id: "h", name: "Bursley", slug: "bursley", type: "DINING HALLS", imageUrl: null,
    hours: [{ name: "Dinner", start: "17:00:00", end: "20:00:00" }] }],
  items: [
    item("1", "Grilled Chicken", 300, 40),
    item("2", "Cheese Pizza", 600, 20),
    item("3", "Ranch", 140, 0),
    item("4", "Lasagna", 900, 35),
  ],
};

describe("suggestForRemaining", () => {
  it("prefers dishes covering remaining protein within remaining calories", () => {
    const out = suggestForRemaining(menu, { calories: 700, protein: 40, carbs: 80, fat: 20 }, PREFS, {
      nowMinutes: 16 * 60,
      include: () => true,
    });
    expect(out[0].offering.item.name).toBe("Grilled Chicken");
    expect(out.map((s) => s.offering.item.name)).not.toContain("Ranch"); // not a meal
    expect(out.map((s) => s.offering.item.name)).not.toContain("Lasagna"); // over calories
  });

  it("suggests nothing when calories are used up or service has ended", () => {
    expect(suggestForRemaining(menu, { calories: 100, protein: 30, carbs: 0, fat: 0 }, PREFS, { nowMinutes: 16 * 60, include: () => true })).toEqual([]);
    expect(suggestForRemaining(menu, { calories: 800, protein: 30, carbs: 0, fat: 0 }, PREFS, { nowMinutes: 21 * 60, include: () => true })).toEqual([]);
  });
});
