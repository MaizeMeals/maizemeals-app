"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogQuery } from "@/lib/catalog-query";
import type { DayMenu } from "@/lib/day-menu/types";
import { fromWire, type DayMenuWire } from "@/lib/day-menu/wire";

type State = { menu: DayMenu | null; loading: boolean; error: string | null };

async function fetchDayMenu(date: string): Promise<DayMenu> {
  const res = await fetch(`/menus/offerings?date=${date}`);
  if (!res.ok) throw new Error(`Menu request failed (${res.status})`);
  return fromWire((await res.json()) as DayMenuWire);
}

/** Public menu for every location on `date` (YYYY-MM-DD, Eastern). */
export function useDayMenu(date: string | null): State {
  const query = useQuery({
    queryKey: ["day-menu", date],
    queryFn: () => fetchDayMenu(date as string),
    enabled: Boolean(date),
    ...catalogQuery,
  });

  return {
    menu: query.data ?? null,
    loading: Boolean(date) && query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
