import type { Metadata } from "next";
import Link from "next/link";
import { getDayMenu } from "@/lib/day-menu/server";
import { easternToday, easternDate } from "@/lib/day-menu/scoring";
import { FoodFinder } from "@/components/menus/FoodFinder";

export const metadata: Metadata = {
  alternates: { canonical: "/menus" },
  title: "Search Today’s U-M Dining Hall Menus | MaizeMeals",
  description:
    "Search every dish on today's U-M dining menus and see which dining halls serve it, when, and how it's rated at each one.",
};

type MenuQuery = { date?: string; q?: string; meal?: string };

export default async function MenusPage({ searchParams }: { searchParams: Promise<MenuQuery> }) {
  const params = await searchParams;
  const today = easternToday();
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    && params.date >= today && params.date <= easternDate(6) ? params.date : today;
  const menu = await getDayMenu(date);
  const search = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const meal = typeof params.meal === "string" ? params.meal : null;
  const examples = new Map<string, Set<string>>();
  for (const item of menu.items) {
    if (search && !item.name.toLowerCase().includes(search)) continue;
    if (meal && !search && !item.meals.includes(meal)) continue;
    const names = examples.get(item.hallId) ?? new Set<string>();
    if (names.size < 3) names.add(item.name);
    examples.set(item.hallId, names);
  }

  return <FoodFinder initialDate={date}>
    <section aria-label="Published menus" className="space-y-3 py-4">
      <h2 className="text-lg font-bold">Campus menus for <time dateTime={date}>{date}</time></h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {menu.halls.filter((hall) => examples.has(hall.id)).map((hall) =>
          <li key={hall.id}>
            <Link className="font-semibold underline" href={`/locations/${hall.slug}?date=${date}`}>{hall.name}</Link>
            <p className="text-sm text-muted-foreground">{[...examples.get(hall.id)!].join(", ")}</p>
          </li>
        )}
      </ul>
      {examples.size === 0 && <p>No matching dishes posted for this date.</p>}
    </section>
  </FoodFinder>;
}
