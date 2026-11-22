import { expect, it } from "vitest";
import { featuredDish } from "./featured-dish";

const dish = (name: string, avgRating = 0, reviewCount = 0) => ({ name, avgRating, reviewCount });

it("features the highest-rated entrée even when a condiment has better ratings", () => {
  expect(featuredDish([
    dish("Ketchup", 5, 10), dish("Assorted Rolls"), dish("Cheese Pizza", 3, 4),
    dish("Black Bean Burger", 4, 2),
  ])?.name).toBe("Black Bean Burger");
});

it("leaves the generic card for a meal with only sides and condiments", () => {
  expect(featuredDish([dish("Ketchup"), dish("Assorted Rolls")])).toBeUndefined();
});
