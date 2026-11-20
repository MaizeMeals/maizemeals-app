import type { DayMenu, DayMenuHall, DayMenuItem } from "./types";
import { dishDisplayName, dishGroupKey, mealRank } from "./types";
import {
  itemFit,
  mealForShift,
  preferenceScore,
  shiftRange,
  type ScoringPrefs,
} from "./scoring";
import { isDiningHall } from "./match";

export type OfferingStatus =
  | { kind: "now"; minutesLeft: number }
  | { kind: "later"; startsAt: string; minutesUntil: number }
  | { kind: "ended" }
  | { kind: "scheduled" }; // a date other than today

export type Offering = {
  item: DayMenuItem;
  hall: DayMenuHall;
  /** Meal shown for this offering (the selected meal, or its first meal). */
  meal: string;
  window: { start: string; end: string } | null;
  status: OfferingStatus;
  score: number;
};

export type Dish = {
  /** Group key (dishGroupKey): near-identical names share one card. */
  key: string;
  /** foodKey of every menu name in the group (favorites match on these). */
  memberKeys: string[];
  name: string;
  /** Representative item (highest scoring offering) for tags/macros. */
  primary: DayMenuItem;
  offerings: Offering[];
  score: number;
  bestRating: { value: number; count: number } | null;
  relevance: number;
  /** Best continuous fit among offerings (tiebreaker when scores tie). */
  fit: number;
};

export type DishQuery = {
  query: string;
  /** A menu_events.meal value, or "Any". */
  meal: string;
  /** Hard filters (dietary + the hall page's FilterDialog: rating, M-Scale, macros). */
  include: (item: DayMenuItem) => boolean;
  includeRetail: boolean;
  /** Minutes since midnight Eastern when the date is today; null otherwise. */
  nowMinutes: number | null;
};

/** Minutes-since-midnight range for each meal, from that day's dining hall hours. */
export type MealWindows = Map<string, [number, number]>;

/** Used when no dining hall posted hours (breaks): typical campus meal times. */
const FALLBACK_WINDOWS: [string, [number, number]][] = [
  ["Breakfast", [7 * 60, 10 * 60 + 30]],
  ["Lunch", [11 * 60, 15 * 60]],
  ["Dinner", [16 * 60 + 30, 20 * 60]],
];
/** A café counts as serving a meal when it is open at least this long during it. */
const MIN_OVERLAP_MINUTES = 30;

export function mealWindows(menu: DayMenu): MealWindows {
  const windows: MealWindows = new Map();
  for (const hall of menu.halls) {
    if (!isDiningHall(hall)) continue;
    for (const shift of hall.hours) {
      const meal = mealForShift(shift.name);
      if (meal === "All Day") continue;
      const [s, e] = shiftRange(shift);
      const cur = windows.get(meal);
      windows.set(meal, cur ? [Math.min(cur[0], s), Math.max(cur[1], e)] : [s, e]);
    }
  }
  return windows.size ? windows : new Map(FALLBACK_WINDOWS);
}

/** A café/market's posted hours for the day as one window (earliest open → latest close). */
function openWindow(hall: DayMenuHall): { start: string; end: string } | null {
  if (!hall.hours.length) return null;
  let first = hall.hours[0];
  let last = hall.hours[0];
  for (const h of hall.hours) {
    if (shiftRange(h)[0] < shiftRange(first)[0]) first = h;
    if (shiftRange(h)[1] > shiftRange(last)[1]) last = h;
  }
  return { start: first.start, end: last.end };
}

/**
 * Meals an item counts toward. Dining hall items keep their own meals; anything
 * on an "All Day" menu (cafés, markets, grills) belongs to every meal its
 * location is open for, so the meal tabs stay Breakfast / Lunch / Dinner.
 */
export function servingMeals(item: DayMenuItem, hall: DayMenuHall, windows: MealWindows): string[] {
  if (!item.meals.includes("All Day")) return item.meals;
  const meals = new Set(item.meals.filter((m) => m !== "All Day"));
  const open = openWindow(hall);
  if (open) {
    const [os, oe] = shiftRange(open);
    for (const [meal, [ws, we]] of windows) {
      if (Math.min(oe, we) - Math.max(os, ws) >= MIN_OVERLAP_MINUTES) meals.add(meal);
    }
  }
  return [...meals].sort((a, b) => mealRank(a) - mealRank(b));
}

/** "Café" / "Market" / "Grill" for non–dining hall locations. */
export function locationKind(hall: DayMenuHall): string | null {
  switch ((hall.type ?? "").toUpperCase()) {
    case "CAFES":
      return "Café";
    case "MARKETS":
      return "Market";
    case "GRILLS":
      return "Grill";
    default:
      return null;
  }
}

/**
 * The shift for `meal` at `hall`. Halls can split a meal into several shifts
 * (e.g. Lunch 11–1 and 2–4): prefer the one running now, then the next one,
 * then the latest that already ended.
 */
function shiftFor(hall: DayMenuHall, meal: string, nowMinutes: number | null = null) {
  const shifts = hall.hours.filter((h) => mealForShift(h.name) === meal);
  // Cafés post one "All Day" shift; their window for any meal is their open hours.
  if (shifts.length === 0 && !isDiningHall(hall)) return openWindow(hall);
  if (shifts.length <= 1 || nowMinutes === null) return shifts[0] ?? null;
  let next: (typeof shifts)[number] | null = null;
  let last: (typeof shifts)[number] | null = null;
  for (const sh of shifts) {
    const [s, e] = shiftRange(sh);
    if (nowMinutes >= s && nowMinutes < e) return sh;
    if (s > nowMinutes && (!next || s < shiftRange(next)[0])) next = sh;
    if (e <= nowMinutes && (!last || e > shiftRange(last)[1])) last = sh;
  }
  return next ?? last ?? shifts[0];
}

function statusFor(window: { start: string; end: string } | null, nowMinutes: number | null): OfferingStatus {
  if (nowMinutes === null || !window) return { kind: "scheduled" };
  const [s, e] = shiftRange(window);
  if (nowMinutes >= s && nowMinutes < e) return { kind: "now", minutesLeft: e - nowMinutes };
  if (nowMinutes < s) return { kind: "later", startsAt: window.start, minutesUntil: s - nowMinutes };
  return { kind: "ended" };
}

const STATUS_RANK: Record<OfferingStatus["kind"], number> = { now: 0, later: 1, scheduled: 2, ended: 3 };

/** 0 = no match. Name prefix > word prefix > substring > station match. */
export function relevance(item: DayMenuItem, terms: string[]): number {
  if (terms.length === 0) return 1;
  const name = item.name.toLowerCase();
  const station = (item.station ?? "").toLowerCase();
  let total = 0;
  for (const t of terms) {
    if (name.startsWith(t)) total += 4;
    else if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) total += 3;
    else if (name.includes(t)) total += 2;
    else if (station.includes(t)) total += 1;
    else return 0; // every term must match somewhere
  }
  return total;
}

export function buildDishes(menu: DayMenu, prefs: ScoringPrefs, q: DishQuery): Dish[] {
  const halls = new Map(menu.halls.map((h) => [h.id, h]));
  const terms = q.query.toLowerCase().split(/\s+/).filter(Boolean);
  const groups = new Map<string, { offerings: Offering[]; relevance: number }>();
  const windows = mealWindows(menu);

  for (const item of menu.items) {
    const hall = halls.get(item.hallId);
    if (!hall) continue;
    if (!q.includeRetail && !isDiningHall(hall)) continue;
    if (q.meal !== "Any" && !servingMeals(item, hall, windows).includes(q.meal)) continue;
    if (!q.include(item)) continue;
    const rel = relevance(item, terms);
    if (rel === 0) continue;

    const meal = q.meal !== "Any" ? q.meal : pickMeal(item, hall, q.nowMinutes);
    const shift = shiftFor(hall, meal, q.nowMinutes);
    const window = shift ? { start: shift.start, end: shift.end } : null;
    const offering: Offering = {
      item,
      hall,
      meal,
      window,
      status: statusFor(window, q.nowMinutes),
      score: preferenceScore(item, prefs),
    };

    const groupKey = dishGroupKey(item.name);
    const g = groups.get(groupKey) ?? { offerings: [], relevance: 0 };
    g.offerings.push(offering);
    g.relevance = Math.max(g.relevance, rel);
    groups.set(groupKey, g);
  }

  const dishes: Dish[] = [];
  for (const [key, g] of groups) {
    g.offerings.sort(
      (a, b) =>
        STATUS_RANK[a.status.kind] - STATUS_RANK[b.status.kind] ||
        b.score - a.score ||
        a.hall.name.localeCompare(b.hall.name),
    );
    const primary = [...g.offerings].sort((a, b) => b.score - a.score)[0].item;
    const rated = g.offerings.filter((o) => o.item.reviewCount > 0);
    const best = rated.sort((a, b) => b.item.avgRating - a.item.avgRating)[0];
    dishes.push({
      key,
      memberKeys: [...new Set(g.offerings.map((o) => o.item.key))],
      name: dishDisplayName(primary.name),
      primary,
      offerings: g.offerings,
      score: Math.max(...g.offerings.map((o) => o.score)),
      bestRating: best ? { value: best.item.avgRating, count: best.item.reviewCount } : null,
      relevance: g.relevance,
      fit: Math.max(...g.offerings.map((o) => itemFit(o.item, prefs))),
    });
  }

  const anyAvailable = (d: Dish) => d.offerings.some((o) => o.status.kind !== "ended");

  return dishes.sort(
    (a, b) =>
      // Today: things you can still get come before things that already ended.
      Number(anyAvailable(b)) - Number(anyAvailable(a)) ||
      b.relevance - a.relevance ||
      b.score - a.score ||
      // Substantial dishes before sides/condiments, then the continuous fit.
      Number(b.primary.macros.calories >= 150) - Number(a.primary.macros.calories >= 150) ||
      b.fit - a.fit ||
      (b.bestRating?.value ?? 0) - (a.bestRating?.value ?? 0) ||
      b.offerings.length - a.offerings.length ||
      a.name.localeCompare(b.name),
  );
}

/** For "Any meal": the meal being served now, else the next one, else the first. */
function pickMeal(item: DayMenuItem, hall: DayMenuHall, nowMinutes: number | null): string {
  const meals = [...item.meals].sort((a, b) => mealRank(a) - mealRank(b));
  if (nowMinutes === null) return meals[0];
  let upcoming: { meal: string; start: number } | null = null;
  for (const meal of meals) {
    const shift = shiftFor(hall, meal, nowMinutes);
    if (!shift) continue;
    const [s, e] = shiftRange(shift);
    if (nowMinutes >= s && nowMinutes < e) return meal;
    if (s > nowMinutes && (!upcoming || s < upcoming.start)) upcoming = { meal, start: s };
  }
  return upcoming?.meal ?? meals[0];
}

/** Meal tabs for the date: real meals only (never "All Day"), in serving order. */
export function mealsOnMenu(menu: DayMenu, includeRetail: boolean): string[] {
  const halls = new Map(menu.halls.map((h) => [h.id, h]));
  const windows = mealWindows(menu);
  const set = new Set<string>();
  for (const it of menu.items) {
    const hall = halls.get(it.hallId);
    if (!hall || (!includeRetail && !isDiningHall(hall))) continue;
    servingMeals(it, hall, windows).forEach((m) => set.add(m));
  }
  set.delete("All Day");
  return [...set].sort((a, b) => mealRank(a) - mealRank(b));
}
