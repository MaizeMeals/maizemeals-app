import { foodIconFor } from "@/lib/food-icons";
import type { DayMenuItem } from "./types";

// Limit the card to recognizable entrées. Unclassified dishes use the generic card.
const entreeIcons = new Set([
  "bento-box", "burrito", "curry-rice", "cut-of-meat", "dumpling", "falafel",
  "fish", "hamburger", "hot-dog", "meat-on-bone", "pancakes", "pizza",
  "pot-of-food", "poultry-leg", "sandwich", "shallow-pan-of-food", "spaghetti",
  "steaming-bowl", "stuffed-flatbread", "sushi", "taco", "tamale", "waffle",
]);

type Candidate = Pick<DayMenuItem, "name" | "avgRating" | "reviewCount">;

export function featuredDish(items: Candidate[]): Candidate | undefined {
  return items.filter((item) => entreeIcons.has(foodIconFor(item.name)))
    .sort((a, b) =>
      (b.reviewCount ? b.avgRating : 0) - (a.reviewCount ? a.avgRating : 0)
      || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name),
    )[0];
}
