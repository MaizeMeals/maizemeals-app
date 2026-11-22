import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Database } from "@/types/supabase";
import { easternToday } from "@/lib/day-menu/scoring";
import {
  addDays,
  buildScheduleNotice,
  NOTICE_BASELINE_WEEKS,
  NOTICE_LOOKAHEAD_DAYS,
  type LocationDay,
  type ScheduleNotice,
} from "@/lib/schedule-notice";

async function loadNotice(today: string): Promise<ScheduleNotice | null> {
  // Menu data is public: no cookies, so the result is safe to cache for everyone.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.rpc("menu_location_days", {
    p_from: addDays(today, -7 * NOTICE_BASELINE_WEEKS),
    p_to: addDays(today, NOTICE_LOOKAHEAD_DAYS - 1),
  });
  if (error || !data) {
    if (error) console.error("[schedule-notice]", error.message);
    return null;
  }
  const days: LocationDay[] = data.map((row) => ({
    date: row.date,
    halls: Array.isArray(row.halls)
      ? (row.halls as { name?: string; slug?: string }[]).map((h) => ({ name: String(h.name ?? ""), slug: String(h.slug ?? "") }))
      : [],
  }));
  return buildScheduleNotice(days, today);
}

/** Cached per day; refreshed with the day-menu tag after each scrape. */
export function getScheduleNotice(): Promise<ScheduleNotice | null> {
  const today = easternToday();
  return unstable_cache(() => loadNotice(today), ["schedule-notice-v1", today], {
    revalidate: 1800,
    tags: ["day-menu"],
  })();
}
