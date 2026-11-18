import { describe, expect, it } from "vitest";
import type { Item } from "@/types/dining";
import {
  compareItemsBySmartPreferences,
  itemPreferenceScore,
} from "./preference-scoring";

const neutralPrefs = {
  health_focus: 0,
  protein_priority: 0,
  rating_sensitivity: 0,
  implicit_traits: {
    boosted_item_ids: {} as Record<string, number>,
    avoid_tags: [] as string[],
  },
};

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

describe("itemPreferenceScore", () => {
  it("adds a protein boost only when priority is above 70 and protein is above 20", () => {
    const highProtein = makeItem({
      id: "chicken",
      name: "Chicken",
      macronutrients: { Protein: 21 },
    });
    const boundaryProtein = makeItem({
      id: "rice",
      name: "Rice",
      macronutrients: { Protein: 20 },
    });

    expect(
      itemPreferenceScore(highProtein, { ...neutralPrefs, protein_priority: 71 }),
    ).toBe(65);
    expect(
      itemPreferenceScore(highProtein, { ...neutralPrefs, protein_priority: 70 }),
    ).toBe(50);
    expect(
      itemPreferenceScore(boundaryProtein, {
        ...neutralPrefs,
        protein_priority: 80,
      }),
    ).toBe(50);
  });

  it("scales rated items by rating sensitivity and treats unrated food as neutral", () => {
    const rated = makeItem({
      id: "rated",
      name: "Rated Bowl",
      avg_rating: 4.5,
      review_count: 3,
    });
    const unrated = makeItem({
      id: "unrated",
      name: "Unrated Bowl",
      avg_rating: 5,
      review_count: 0,
    });

    expect(
      itemPreferenceScore(rated, { ...neutralPrefs, rating_sensitivity: 100 }),
    ).toBe(65);
    expect(
      itemPreferenceScore(rated, { ...neutralPrefs, rating_sensitivity: 0 }),
    ).toBe(50);
    expect(
      itemPreferenceScore(unrated, { ...neutralPrefs, rating_sensitivity: 100 }),
    ).toBe(50);
  });
});

describe("compareItemsBySmartPreferences", () => {
  it("orders a higher score first and breaks ties by name", () => {
    const apple = makeItem({ id: "apple", name: "Apple" });
    const banana = makeItem({ id: "banana", name: "Banana" });
    const chicken = makeItem({
      id: "chicken",
      name: "Zucchini Chicken",
      macronutrients: { Protein: 30 },
    });
    const proteinPrefs = { ...neutralPrefs, protein_priority: 80 };

    expect(compareItemsBySmartPreferences(apple, banana, neutralPrefs)).toBeLessThan(
      0,
    );
    expect(compareItemsBySmartPreferences(banana, apple, neutralPrefs)).toBeGreaterThan(
      0,
    );
    expect(
      compareItemsBySmartPreferences(apple, chicken, proteinPrefs),
    ).toBeGreaterThan(0);
  });
});
