import { describe, expect, it } from "vitest";
import {
  currentOrNextShift,
  itemFit,
  mealForShift,
  shiftRange,
  type ScoringPrefs,
} from "./scoring";
import type { DayMenuHall, DayMenuItem } from "./types";

const NEUTRAL: ScoringPrefs = {
  dietary_filters: [],
  health_focus: 50,
  protein_priority: 50,
  rating_sensitivity: 50,
  implicit_traits: { boosted_item_ids: {}, avoid_tags: [] },
};

function hall(hours: DayMenuHall["hours"]): DayMenuHall {
  return {
    id: "bursley",
    name: "Bursley",
    slug: "bursley",
    type: "DINING HALLS",
    imageUrl: null,
    hours,
  };
}

function item(overrides: Partial<DayMenuItem> = {}): DayMenuItem {
  return {
    id: "tofu",
    hallId: "bursley",
    name: "Tofu Bowl",
    key: "tofu bowl",
    station: "Hot Line",
    tags: [],
    servingSize: null,
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    mScale: 1,
    avgRating: 1,
    reviewCount: 1,
    meals: ["Lunch"],
    ...overrides,
  };
}

describe("shiftRange", () => {
  it("keeps a same-day 11:00–14:00 window on the same day", () => {
    expect(shiftRange({ start: "11:00", end: "14:00" })).toEqual([11 * 60, 14 * 60]);
    expect(shiftRange({ start: "11:00:00", end: "14:00:00" })).toEqual([11 * 60, 14 * 60]);
  });

  it("rolls an overnight end onto the next day, including a zero-length midnight window", () => {
    expect(shiftRange({ start: "22:00", end: "02:00" })).toEqual([22 * 60, 2 * 60 + 24 * 60]);
    expect(shiftRange({ start: "22:00:00", end: "02:00:00" })).toEqual([
      22 * 60,
      2 * 60 + 24 * 60,
    ]);
    expect(shiftRange({ start: "00:00", end: "00:00" })).toEqual([0, 24 * 60]);
    expect(shiftRange({ start: "00:00:00", end: "00:00:00" })).toEqual([0, 24 * 60]);
  });
});

describe("currentOrNextShift", () => {
  it("is open while now is inside a shift", () => {
    const state = currentOrNextShift(
      hall([{ name: "LUNCH", start: "11:00:00", end: "14:00:00" }]),
      12 * 60,
    );
    expect(state).toMatchObject({ kind: "open", meal: "Lunch", minutesLeft: 2 * 60 });
  });

  it("is upcoming when the next shift starts later today", () => {
    const state = currentOrNextShift(
      hall([
        { name: "Breakfast", start: "08:00:00", end: "10:00:00" },
        { name: "Dinner", start: "17:00:00", end: "20:00:00" },
      ]),
      12 * 60,
    );
    expect(state).toMatchObject({
      kind: "upcoming",
      meal: "Dinner",
      minutesUntil: 5 * 60,
    });
  });

  it("is closed when every shift start is already in the past", () => {
    const state = currentOrNextShift(
      hall([
        { name: "Breakfast", start: "08:00:00", end: "10:30:00" },
        { name: "Lunch", start: "11:00:00", end: "14:00:00" },
      ]),
      15 * 60,
    );
    expect(state).toEqual({ kind: "closed" });
  });

  it("treats 23:00 as open for a 22:00–02:00 shift", () => {
    const state = currentOrNextShift(
      hall([{ name: "Late Night", start: "22:00:00", end: "02:00:00" }]),
      23 * 60,
    );
    expect(state).toMatchObject({
      kind: "open",
      meal: "Late Night",
      minutesLeft: 3 * 60,
    });
  });
});

describe("mealForShift", () => {
  it("maps lunch names onto the menu meal and unknown names onto All Day", () => {
    expect(mealForShift("LUNCH")).toBe("Lunch");
    expect(mealForShift("Lunch")).toBe("Lunch");
    expect(mealForShift("Open")).toBe("All Day");
    expect(mealForShift("24/7 Kiosk")).toBe("All Day");
  });
});

describe("itemFit", () => {
  it("floors a boosted item at 0.95 and keeps an unboosted item in 0..1", () => {
    const plain = item();
    const unboosted = itemFit(plain, NEUTRAL);
    expect(unboosted).toBeGreaterThanOrEqual(0);
    expect(unboosted).toBeLessThanOrEqual(1);
    expect(unboosted).toBeLessThan(0.95);

    const boosted = itemFit(plain, {
      ...NEUTRAL,
      implicit_traits: { boosted_item_ids: { [plain.id]: 1 }, avoid_tags: [] },
    });
    expect(boosted).toBeGreaterThanOrEqual(0.95);

    const typical = itemFit(
      item({
        id: "chili",
        macros: { calories: 320, protein: 15, carbs: 28, fat: 9, fiber: 4 },
        mScale: 4,
        avgRating: 4,
        reviewCount: 8,
      }),
      NEUTRAL,
    );
    expect(typical).toBeGreaterThan(0);
    expect(typical).toBeLessThanOrEqual(1);
  });
});
