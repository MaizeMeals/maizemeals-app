import "server-only";
import { matchedLabel } from "../label-source";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Database } from "@/types/supabase";
import { foodKey, mealRank, type DayMenu, type DayMenuHall, type DayMenuItem } from "./types";

/** PostgREST caps responses at 1000 rows; a day has ~1,200 menu events. */
const PAGE_SIZE = 1000;

type EventRow = {
  meal: string;
  item_id: string;
  dining_hall_id: string;
  items: {
    id: string;
    name: string;
    normalized_name: string | null;
    station: string | null;
    dietary_tags: string[] | null;
    serving_size: string | null;
    macronutrients: unknown;
    nutrition_score: number | null;
    avg_rating: number | null;
    review_count: number;
    item_type: string | null;
    allergens: string[] | null;
    label_source: unknown;
    ingredient_flags: { categories?: string[] } | null;
  } | null;
};

function anonClient() {
  // Menu data is public; no cookies, so the result is safe to cache across users.
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function num(record: Record<string, unknown>, key: string): number {
  const v = Number(record[key] ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

async function loadDayMenu(date: string): Promise<DayMenu> {
  const supabase = anonClient();

  const [hallsRes, hoursRes] = await Promise.all([
    supabase.from("dining_halls").select("id, name, display_name, slug, type, image_url"),
    supabase
      .from("operating_hours")
      .select("dining_hall_id, event_name, start_time, end_time")
      .eq("date", date)
      .order("start_time"),
  ]);
  if (hallsRes.error) throw hallsRes.error;
  if (hoursRes.error) throw hoursRes.error;

  const events: EventRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("menu_events")
      .select(
        `meal, item_id, dining_hall_id,
         items ( id, name, normalized_name, station, dietary_tags, serving_size,
                 macronutrients, nutrition_score, avg_rating, review_count, item_type,
                 allergens, ingredient_flags, label_source:nutrition_label->source )`,
      )
      .eq("date", date)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    events.push(...((data ?? []) as unknown as EventRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const hoursByHall = new Map<string, DayMenuHall["hours"]>();
  for (const h of hoursRes.data ?? []) {
    const list = hoursByHall.get(h.dining_hall_id) ?? [];
    list.push({ name: h.event_name ?? "Open", start: h.start_time, end: h.end_time });
    hoursByHall.set(h.dining_hall_id, list);
  }

  const items = new Map<string, DayMenuItem>();
  const hallsWithMenu = new Set<string>();
  for (const e of events) {
    const it = e.items;
    if (!it || (it.item_type ?? "food") !== "food") continue;
    hallsWithMenu.add(e.dining_hall_id);
    const existing = items.get(it.id);
    if (existing) {
      if (!existing.meals.includes(e.meal)) existing.meals.push(e.meal);
      continue;
    }
    const m =
      it.macronutrients && typeof it.macronutrients === "object" && !Array.isArray(it.macronutrients)
        ? (it.macronutrients as Record<string, unknown>)
        : {};
    items.set(it.id, {
      id: it.id,
      hallId: e.dining_hall_id,
      name: it.name.trim(),
      key: foodKey(it.normalized_name || it.name),
      station: it.station,
      tags: it.dietary_tags ?? [],
      servingSize: it.serving_size,
      macros: {
        calories: num(m, "Calories"),
        protein: num(m, "Protein"),
        carbs: num(m, "Total Carbohydrate"),
        fat: num(m, "Total Fat"),
        fiber: num(m, "Dietary Fiber"),
        satFat: num(m, "Saturated Fat"),
        sodium: num(m, "Sodium"),
        sugars: num(m, "Sugars"),
      },
      mScale: it.nutrition_score,
      avgRating: it.avg_rating ?? 0,
      reviewCount: it.review_count ?? 0,
      meals: [e.meal],
      allergens: it.allergens ?? [],
      additives: Array.isArray(it.ingredient_flags?.categories) ? it.ingredient_flags.categories : [],
      labelMatch: matchedLabel(it.label_source, it.id, it.station),
    });
  }
  for (const it of items.values()) it.meals.sort((a, b) => mealRank(a) - mealRank(b));

  const halls: DayMenuHall[] = (hallsRes.data ?? [])
    .filter((h) => hallsWithMenu.has(h.id) || hoursByHall.has(h.id))
    .map((h) => ({
      id: h.id,
      name: (h.display_name || h.name).trim(),
      slug: h.slug,
      type: h.type,
      imageUrl: h.image_url,
      hours: hoursByHall.get(h.id) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { date, generatedAt: new Date().toISOString(), halls, items: [...items.values()] };
}

/**
 * Cached per date (menus change once a day when the scraper runs; ratings
 * drift slowly). Revalidate with revalidateTag("day-menu") after a scrape.
 */
// Bump the key ("day-menu-vN") whenever the DayMenu shape changes: the data
// cache survives deploys, so old-shape entries would otherwise be served.
export function getDayMenu(date: string): Promise<DayMenu> {
  return unstable_cache(() => loadDayMenu(date), ["day-menu-label-source-v1", date], {
    revalidate: 600,
    tags: ["day-menu", `day-menu:${date}`],
  })();
}
