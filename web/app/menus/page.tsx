import type { Metadata } from "next";
import { Suspense } from "react";
import { FoodFinder } from "@/components/menus/FoodFinder";

export const metadata: Metadata = {
  title: "Find food | MaizeMeals",
  description:
    "Search every dish on today's U-M dining menus and see which dining halls serve it, when, and how it's rated at each one.",
};

export default function MenusPage() {
  return (
    <Suspense>
      <FoodFinder />
    </Suspense>
  );
}
