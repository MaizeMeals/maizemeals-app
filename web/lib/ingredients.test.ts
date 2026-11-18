import { describe, expect, it } from "vitest";
import { countByCategory, parseIngredientFlags, sortCategories } from "./ingredients";

const TEXT = "Chicken, soybean oil (TBHQ and citric acid added as preservatives), Red 40";

describe("parseIngredientFlags", () => {
  it("keeps valid spans in order and derives categories in display order", () => {
    const flags = parseIngredientFlags(
      {
        categories: ["preservative", "seed_oil", "color"],
        spans: [
          { start: TEXT.indexOf("Red 40"), end: TEXT.indexOf("Red 40") + 6, category: "color", label: "Food coloring", matched: "Red 40" },
          { start: 9, end: 20, category: "seed_oil", label: "Seed oil", matched: "soybean oil" },
          { start: 22, end: 26, category: "preservative", label: "Preservative", matched: "TBHQ" },
        ],
      },
      TEXT,
    );
    expect(flags?.categories).toEqual(["seed_oil", "color", "preservative"]);
    expect(flags?.spans.map((s) => TEXT.slice(s.start, s.end))).toEqual(["soybean oil", "TBHQ", "Red 40"]);
  });

  it("drops spans that are out of range or have unknown categories", () => {
    const flags = parseIngredientFlags(
      { spans: [{ start: 0, end: 999, category: "seed_oil" }, { start: 0, end: 7, category: "mystery" }] },
      TEXT,
    );
    expect(flags?.spans).toEqual([]);
    expect(flags?.categories).toEqual([]);
  });

  it("returns null for missing data", () => {
    expect(parseIngredientFlags(null, TEXT)).toBeNull();
    expect(parseIngredientFlags([], TEXT)).toBeNull();
  });
});

describe("helpers", () => {
  it("sorts and counts", () => {
    expect(sortCategories(["other", "seed_oil", "bogus"])).toEqual(["seed_oil", "other"]);
    expect(
      countByCategory([
        { start: 0, end: 1, category: "emulsifier", label: "", matched: "" },
        { start: 2, end: 3, category: "emulsifier", label: "", matched: "" },
        { start: 4, end: 5, category: "seed_oil", label: "", matched: "" },
      ]),
    ).toEqual([
      { category: "seed_oil", count: 1 },
      { category: "emulsifier", count: 2 },
    ]);
  });
});
