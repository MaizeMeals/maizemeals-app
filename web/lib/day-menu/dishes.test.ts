import { describe, expect, it } from "vitest";
import { buildDishes, relevance } from "./dishes";
import type { ScoringPrefs } from "./scoring";
import type { DayMenu, DayMenuHall, DayMenuItem } from "./types";

const NEUTRAL: ScoringPrefs = {
  dietary_filters: [],
  health_focus: 50,
  protein_priority: 50,
  rating_sensitivity: 50,
  implicit_traits: { boosted_item_ids: {}, avoid_tags: [] },
};

function hall(
  id: string,
  name: string,
  hours: DayMenuHall["hours"],
): DayMenuHall {
  return {
    id,
    name,
    slug: id,
    type: "DINING HALLS",
    imageUrl: null,
    hours,
  };
}

function item(overrides: Partial<DayMenuItem> & Pick<DayMenuItem, "id" | "hallId" | "name">): DayMenuItem {
  return {
    key: overrides.name.toLowerCase(),
    station: null,
    tags: [],
    servingSize: null,
    macros: { calories: 180, protein: 8, carbs: 20, fat: 6, fiber: 2, satFat: 0, sodium: 0, sugars: 0 },
    mScale: 3,
    avgRating: 0,
    reviewCount: 0,
    meals: ["Lunch"],
    allergens: [],
    additives: [],
    ...overrides,
  };
}

function menu(halls: DayMenuHall[], items: DayMenuItem[]): DayMenu {
  return {
    date: "2026-03-18",
    generatedAt: "2026-03-18T16:00:00.000Z",
    halls,
    items,
  };
}

describe("relevance", () => {
  it("ranks a name prefix above a word match, a substring, and a station-only match", () => {
    const prefix = relevance(
      item({ id: "1", hallId: "h", name: "Pizza Slice", station: "Oven" }),
      ["pizza"],
    );
    const word = relevance(
      item({ id: "2", hallId: "h", name: "Cheese Pizza", station: "Oven" }),
      ["pizza"],
    );
    const substring = relevance(
      item({ id: "3", hallId: "h", name: "Cheesepizza Bowl", station: "Oven" }),
      ["pizza"],
    );
    const station = relevance(
      item({ id: "4", hallId: "h", name: "Garden Salad", station: "Pizza Oven" }),
      ["pizza"],
    );

    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(station);
    expect(station).toBeGreaterThan(0);
  });

  it("returns 0 when any term matches neither the name nor the station", () => {
    const dish = item({ id: "1", hallId: "h", name: "Pizza Slice", station: "Oven" });
    expect(relevance(dish, ["sushi"])).toBe(0);
    expect(relevance(dish, ["pizza", "sushi"])).toBe(0);
  });
});

describe("buildDishes", () => {
  it("groups offerings that share an item key", () => {
    const lunch = [{ name: "Lunch", start: "11:00:00", end: "14:00:00" }];
    const dishes = buildDishes(
      menu(
        [hall("east", "East Quad", lunch), hall("markley", "Markley", lunch)],
        [
          item({
            id: "east-cheese",
            hallId: "east",
            name: "Grilled Cheese",
            key: "grilled cheese",
          }),
          item({
            id: "markley-cheese",
            hallId: "markley",
            name: "Grilled Cheese",
            key: "grilled cheese",
          }),
        ],
      ),
      NEUTRAL,
      {
        query: "",
        meal: "Any",
        include: () => true,
        includeRetail: false,
        nowMinutes: 12 * 60,
      },
    );

    expect(dishes).toHaveLength(1);
    expect(dishes[0]?.key).toBe("grilled cheese");
    expect(dishes[0]?.offerings.map((offering) => offering.item.id).sort()).toEqual([
      "east-cheese",
      "markley-cheese",
    ]);
  });

  it("sorts a dish whose offerings have all ended after one that is still available", () => {
    const dishes = buildDishes(
      menu(
        [
          hall("east", "East Quad", [{ name: "Lunch", start: "11:00:00", end: "14:00:00" }]),
          hall("markley", "Markley", [{ name: "Dinner", start: "17:00:00", end: "20:00:00" }]),
        ],
        [
          item({
            id: "soup",
            hallId: "east",
            name: "Tomato Soup",
            key: "tomato soup",
            meals: ["Lunch"],
            allergens: [],
            additives: [],
            macros: { calories: 400, protein: 10, carbs: 30, fat: 12, fiber: 3, satFat: 0, sodium: 0, sugars: 0 },
            avgRating: 5,
            reviewCount: 20,
          }),
          item({
            id: "pasta",
            hallId: "markley",
            name: "Pasta",
            key: "pasta",
            meals: ["Dinner"],
            allergens: [],
            additives: [],
            macros: { calories: 80, protein: 3, carbs: 14, fat: 1, fiber: 1, satFat: 0, sodium: 0, sugars: 0 },
          }),
        ],
      ),
      NEUTRAL,
      {
        query: "",
        meal: "Any",
        include: () => true,
        includeRetail: false,
        nowMinutes: 15 * 60,
      },
    );

    expect(dishes.map((dish) => dish.key)).toEqual(["pasta", "tomato soup"]);
    expect(dishes[0]?.offerings.some((offering) => offering.status.kind !== "ended")).toBe(true);
    expect(dishes[1]?.offerings.every((offering) => offering.status.kind === "ended")).toBe(true);
    expect(dishes[1]?.score).toBeGreaterThan(dishes[0]?.score ?? 0);
  });
});
