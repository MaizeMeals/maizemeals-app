import { describe, expect, it } from "vitest";
import { computeHallMatches } from "./match";
import type { ScoringPrefs } from "./scoring";
import type { DayMenu, DayMenuHall, DayMenuItem } from "./types";

const NEUTRAL: ScoringPrefs = {
  dietary_filters: [],
  health_focus: 50,
  protein_priority: 50,
  rating_sensitivity: 50,
  implicit_traits: { boosted_item_ids: {}, avoid_tags: [] },
};

const LUNCH: DayMenuHall["hours"] = [{ name: "Lunch", start: "11:00:00", end: "14:00:00" }];
const NOON = 12 * 60;

function hall(id: string, name = id): DayMenuHall {
  return {
    id,
    name,
    slug: id,
    type: "DINING HALLS",
    imageUrl: null,
    hours: LUNCH,
  };
}

function item(id: string, hallId: string, overrides: Partial<DayMenuItem> = {}): DayMenuItem {
  return {
    id,
    hallId,
    name: overrides.name ?? id,
    key: overrides.key ?? id,
    station: "Entree",
    tags: [],
    servingSize: null,
    macros: { calories: 220, protein: 12, carbs: 24, fat: 7, fiber: 3, satFat: 0, sodium: 0, sugars: 0 },
    mScale: 3,
    avgRating: 0,
    reviewCount: 0,
    meals: ["Lunch"],
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

describe("computeHallMatches", () => {
  it("scores a hall 0 and cites dealbreakers when every item fails a vegan filter", () => {
    const matches = computeHallMatches(
      menu(
        [hall("bursley", "Bursley")],
        [item("chicken", "bursley", { name: "Fried Chicken", tags: [] })],
      ),
      { ...NEUTRAL, dietary_filters: ["vegan"] },
      NOON,
    );

    const match = matches.get("bursley");
    expect(match).toBeDefined();
    expect(match?.score).toBe(0);
    expect(match?.eligibleCount).toBe(0);
    expect(match?.reasons.some((reason) => reason.toLowerCase().includes("dealbreaker"))).toBe(
      true,
    );
  });

  it("adds a reason starting with \"Your usual\" for a boosted eligible item", () => {
    const usual = item("tofu", "bursley", { name: "Tofu Bowl", tags: ["Vegan"] });
    const matches = computeHallMatches(
      menu([hall("bursley", "Bursley")], [usual]),
      {
        ...NEUTRAL,
        implicit_traits: { boosted_item_ids: { [usual.id]: 1 }, avoid_tags: [] },
      },
      NOON,
    );

    const reasons = matches.get("bursley")?.reasons ?? [];
    expect(reasons.some((reason) => reason.startsWith("Your usual"))).toBe(true);
    expect(reasons[0]).toContain("Tofu Bowl");
  });

  it("scores more eligible items higher than one when fit is otherwise the same", () => {
    const oneHall = hall("one", "One");
    const manyHall = hall("many", "Many");
    const matches = computeHallMatches(
      menu(
        [oneHall, manyHall],
        [
          item("only", "one"),
          ...Array.from({ length: 4 }, (_, index) => item(`bowl-${index}`, "many")),
        ],
      ),
      NEUTRAL,
      NOON,
    );

    const one = matches.get("one");
    const many = matches.get("many");
    expect(one?.eligibleCount).toBe(1);
    expect(many?.eligibleCount).toBe(4);
    expect(many?.score).toBeGreaterThan(one?.score ?? 0);
  });
});
