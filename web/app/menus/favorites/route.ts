import { NextResponse, type NextRequest } from "next/server";
import { getDayMenu } from "@/lib/day-menu/server";
import { mealRank, type DayMenuHall, type UpcomingFavorite } from "@/lib/day-menu/types";
import { easternMinutes, mealForShift, shiftRange } from "@/lib/day-menu/scoring";

const MAX_KEYS = 300;
const DAYS = 7;

/** Today only: is any shift for `meal` at `hall` still running or upcoming? */
function mealStillAhead(hall: DayMenuHall, meal: string, nowMinutes: number): boolean {
  const shifts = hall.hours.filter((h) => mealForShift(h.name) === meal);
  if (shifts.length === 0) return true; // no hours posted: don't hide it
  return shifts.some((sh) => shiftRange(sh)[1] > nowMinutes);
}

function easternDate(offset: number): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset, 12)).toISOString().slice(0, 10);
}

/**
 * POST /menus/favorites { keys: string[] } → the next time (within a week)
 * each favorite dish is served, and where. Reads the same per-date cached
 * menus as /menus/offerings, so it's cheap. POST keeps the user's favorites
 * out of URLs and caches.
 */
export async function POST(request: NextRequest) {
  let keys: string[];
  try {
    const body = (await request.json()) as { keys?: unknown };
    keys = Array.isArray(body.keys)
      ? body.keys.filter((k): k is string => typeof k === "string" && k.length > 0 && k.length <= 200)
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (keys.length === 0) return NextResponse.json({ upcoming: [] });
  if (keys.length > MAX_KEYS) keys = keys.slice(0, MAX_KEYS);

  const wanted = new Set(keys);
  const found = new Map<string, UpcomingFavorite>();

  const nowMinutes = easternMinutes();

  try {
    for (let i = 0; i < DAYS && found.size < wanted.size; i++) {
      const date = easternDate(i);
      const menu = await getDayMenu(date);
      const halls = new Map(menu.halls.map((h) => [h.id, h]));
      // key → meal → halls, for favorites not already found on an earlier day
      const hits = new Map<string, { name: string; byMeal: Map<string, UpcomingFavorite["halls"]> }>();

      for (const it of menu.items) {
        if (!wanted.has(it.key) || found.has(it.key)) continue;
        const hall = halls.get(it.hallId);
        if (!hall) continue;
        // Today, skip meals that already ended (e.g. lunch at 6 PM).
        const meals = [...it.meals]
          .filter((m) => i > 0 || mealStillAhead(hall, m, nowMinutes))
          .sort((a, b) => mealRank(a) - mealRank(b));
        if (meals.length === 0) continue;
        const meal = meals[0];
        const hit = hits.get(it.key) ?? { name: it.name, byMeal: new Map<string, UpcomingFavorite["halls"]>() };
        const list = hit.byMeal.get(meal) ?? [];
        if (!list.some((h) => h.slug === hall.slug)) {
          list.push({ name: hall.name, slug: hall.slug, itemId: it.id });
        }
        hit.byMeal.set(meal, list);
        hits.set(it.key, hit);
      }

      for (const [key, hit] of hits) {
        const meal = [...hit.byMeal.keys()].sort((a, b) => mealRank(a) - mealRank(b))[0];
        found.set(key, {
          key,
          name: hit.name,
          date,
          meal,
          halls: hit.byMeal.get(meal)!.sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    }
  } catch (err) {
    console.error("[menus/favorites] failed", err);
    return NextResponse.json({ error: "Could not load menus." }, { status: 500 });
  }

  const upcoming = [...found.values()].sort((a, b) => a.date.localeCompare(b.date) || mealRank(a.meal) - mealRank(b.meal));
  return NextResponse.json({ upcoming }, { headers: { "Cache-Control": "private, no-store" } });
}
