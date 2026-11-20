import { describe, expect, it } from "vitest";
import { addExtraNutrients, extraNutrients } from "./nutrition";

describe("extraNutrients", () => {
  it("scales label values by servings and ignores junk", () => {
    expect(extraNutrients({ "Dietary Fiber": 3, Sugars: "4", Sodium: 500, "Saturated Fat": null }, 2)).toEqual({
      fiber: 6, sugar: 8, sodium: 1000, satFat: 0,
    });
    expect(extraNutrients(null, 1)).toEqual({ fiber: 0, sugar: 0, sodium: 0, satFat: 0 });
  });

  it("adds up", () => {
    const a = { fiber: 1, sugar: 2, sodium: 3, satFat: 4 };
    expect(addExtraNutrients(a, a)).toEqual({ fiber: 2, sugar: 4, sodium: 6, satFat: 8 });
  });
});
