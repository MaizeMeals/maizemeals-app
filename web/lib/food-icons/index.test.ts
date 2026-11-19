import { describe, expect, it } from "vitest";
import { DEFAULT_FOOD_ICON, foodIconFor } from "./index";
import data from "./rules.json";
import fs from "node:fs";
import path from "node:path";

describe("foodIconFor", () => {
  it.each([
    ["BBQ Chicken Pizza", "pizza"],
    ["Strawberry Shortcake Bar", "cookie"],
    ["Chicken Tortilla Soup", "pot-of-food"],
    ["Beef Chili", "pot-of-food"],
    ["Chili Lime Kale", "leafy-green"],
    ["Alfredo Sauce", "jar"],
    ["Fettuccine Alfredo", "spaghetti"],
    ["Penne Pasta with Marinara Sauce", "spaghetti"],
    ["Egg and Cheese Bagel", "sandwich"],
    ["Scrambled Eggs", "cooking"],
    ["Iced Latte", "cup-with-straw"],
    ["Cappuccino Muffin", "bread"],
    ["Hamburger Buns", "bread"],
    ["Turkey Burger on White Bun", "hamburger"],
    ["Fortune Cookies", "fortune-cookie"],
    ["Rice Krispie Treats", "candy"],
    ["Cucumber Rosemary Infused Water", "ice"],
  ])("%s → %s", (name, icon) => {
    expect(foodIconFor(name)).toBe(icon);
  });

  it("falls back to the plate", () => {
    expect(foodIconFor("PARSTOCK WV MTO SABROSO")).toBe(DEFAULT_FOOD_ICON);
    expect(foodIconFor(null)).toBe(DEFAULT_FOOD_ICON);
  });

  it("has an SVG for every icon the rules can return", () => {
    const icons = new Set([...data.rules.map((r) => r[1]), ...Object.values(data.overrides), DEFAULT_FOOD_ICON]);
    for (const icon of icons) {
      expect(fs.existsSync(path.join(__dirname, "../../public/icons/food", `${icon}.svg`)), icon).toBe(true);
    }
  });
});
