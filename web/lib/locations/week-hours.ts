import "server-only";
import { unstable_cache } from "next/cache";
import { anonClient } from "@/lib/supabase/public";
import { getLocationDirectory } from "@/lib/locations/directory";
import { easternDate, easternToday } from "@/lib/day-menu/scoring";
import type { DiningHall } from "@/types/dining";

export type Shift = { name: string; start: string; end: string };
export type HallWeek = { hall: DiningHall; days: Record<string, Shift[]> };
export type WeekHours = { dates: string[]; halls: HallWeek[] };

const TYPE_ORDER = ["DINING HALLS", "CAFES", "MARKETS", "GRILLS"];

async function load(today: string): Promise<WeekHours> {
  const dates = Array.from({ length: 7 }, (_, i) => easternDate(i));
  const [halls, { data, error }] = await Promise.all([
    getLocationDirectory(),
    anonClient()
      .from("operating_hours")
      .select("dining_hall_id, date, event_name, start_time, end_time")
      .gte("date", today)
      .lte("date", dates[dates.length - 1])
      .order("date")
      .order("start_time")
      .limit(2000),
  ]);
  if (error) throw error;

  const byHall = new Map<string, Record<string, Shift[]>>();
  for (const row of data ?? []) {
    const days = byHall.get(row.dining_hall_id) ?? {};
    (days[row.date] ??= []).push({ name: row.event_name ?? "Open", start: row.start_time, end: row.end_time });
    byHall.set(row.dining_hall_id, days);
  }

  const rank = (h: DiningHall) => {
    const i = TYPE_ORDER.indexOf((h.type ?? "").toUpperCase());
    return i === -1 ? TYPE_ORDER.length : i;
  };
  return {
    dates,
    halls: halls
      .map((hall) => ({ hall, days: byHall.get(hall.id) ?? {} }))
      .sort((a, b) => rank(a.hall) - rank(b.hall) || (a.hall.display_name || a.hall.name).localeCompare(b.hall.display_name || b.hall.name)),
  };
}

/** Every location's posted hours for today and the next six days. */
export function getWeekHours(): Promise<WeekHours> {
  const today = easternToday();
  return unstable_cache(() => load(today), ["week-hours-v1", today], { revalidate: 600, tags: ["day-menu"] })();
}
