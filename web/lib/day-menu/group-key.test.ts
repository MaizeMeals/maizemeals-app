import { describe, expect, it } from "vitest";
import { dishDisplayName, dishGroupKey } from "./types";

describe("dishGroupKey", () => {
  it("merges wording variants of the same dish", () => {
    const a = dishGroupKey("Beef & Mushroom Blended Burger w/ Cheese");
    expect(dishGroupKey("Beef & Mushroom Blend Burger w/ American")).toBe(a);
    expect(dishGroupKey("Beef and Mushroom Blended Burger with American Cheese")).toBe(a);
  });

  it("keeps real differences apart", () => {
    const cheese = dishGroupKey("Beef & Mushroom Blended Burger w/ Cheese");
    expect(dishGroupKey("Beef & Mushroom Blend Burger w/ Cheddar")).not.toBe(cheese);
    expect(dishGroupKey("Beef and Mushroom Blended Burger")).not.toBe(cheese);
    expect(dishGroupKey("Black Bean Burger w/ Sauteed Onions")).not.toBe(dishGroupKey("Black Bean Burger"));
    expect(dishGroupKey("Halal Chicken Tenders")).not.toBe(dishGroupKey("Chicken Tenders"));
  });

  it("ignores the bun a dish is served on", () => {
    const k = dishGroupKey("Black Bean Burger");
    for (const n of ["Black Bean Burger w/ White Bun", "Black Bean Burger w/ Wheat Bun", "Black Bean Burger w/ King's Hawaiian Bun"]) {
      expect(dishGroupKey(n)).toBe(k);
    }
    expect(dishGroupKey("Cajun Seasoned Turkey Burger on White")).toBe(dishGroupKey("Cajun Seasoned Turkey Burger"));
    expect(dishGroupKey("Hamburger Bun")).not.toBe(dishGroupKey("Hamburger"));
    // An entree on a bun is a sandwich: buns merge with each other, not the entree.
    expect(dishGroupKey("BBQ Chicken on White Bun")).not.toBe(dishGroupKey("BBQ Chicken"));
    expect(dishGroupKey("BBQ Chicken on White Bun")).toBe(dishGroupKey("BBQ Chicken on Pretzel Bun"));
  });

  it("treats plurals as the same dish", () => {
    expect(dishGroupKey("Winter Vegetables Blend")).toBe(dishGroupKey("Winter Vegetable Blend"));
  });

  it("drops the bun from card titles only where it doesn't change the dish", () => {
    expect(dishDisplayName("Black Bean Burger w/ White Bun")).toBe("Black Bean Burger");
    expect(dishDisplayName("Turkey Burger on King's Hawaiian Bun")).toBe("Turkey Burger");
    expect(dishDisplayName("BBQ Chicken on White Bun")).toBe("BBQ Chicken on White Bun");
    expect(dishDisplayName("Pizza")).toBe("Pizza");
  });
});
