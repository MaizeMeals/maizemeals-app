"use client";

import { useEffect, useState } from "react";
import type { DayMenu } from "@/lib/day-menu/types";

type State = { menu: DayMenu | null; loading: boolean; error: string | null };

/** In-memory cache so switching tabs/pages doesn't refetch the same day. */
const memo = new Map<string, Promise<DayMenu>>();

function fetchDayMenu(date: string): Promise<DayMenu> {
  let p = memo.get(date);
  if (!p) {
    p = fetch(`/menus/offerings?date=${date}`).then(async (res) => {
      if (!res.ok) throw new Error(`Menu request failed (${res.status})`);
      return (await res.json()) as DayMenu;
    });
    p.catch(() => memo.delete(date));
    memo.set(date, p);
  }
  return p;
}

/** Public menu for every location on `date` (YYYY-MM-DD, Eastern). */
export function useDayMenu(date: string | null): State {
  const [state, setState] = useState<State>({ menu: null, loading: Boolean(date), error: null });

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setState((s) => ({ menu: s.menu?.date === date ? s.menu : null, loading: true, error: null }));
    fetchDayMenu(date)
      .then((menu) => !cancelled && setState({ menu, loading: false, error: null }))
      .catch((err: Error) => !cancelled && setState({ menu: null, loading: false, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [date]);

  return state;
}
