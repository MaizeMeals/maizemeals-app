import { foodKey, type DayMenu, type DayMenuHall, type DayMenuItem } from "./types";

/**
 * Compact transport format for GET /menus/offerings (much smaller gzipped
 * than the plain DayMenu JSON, which matters on dining-hall signal). Only the
 * HTTP boundary uses it: the server encodes with `toWire`, `useDayMenu`
 * decodes with `fromWire`, and everything else works with `DayMenu`.
 *
 * Item tuple (v2):
 *   [id, hallIndex, name, station, tags,
 *    [cal, protein, carbs, fat, fiber, satFat, sodium, sugars],
 *    mScale, avgRating, reviewCount, meals, servingSize]
 * - v2 adds satFat/sodium/sugars + servingSize so the item drawer can render
 *   the full nutrition label instantly (no second pop while loading).
 * - v3 appends allergens + additive categories (row markers in Find food).
 * - `key` is recomputed from `name` (foodKey(normalized_name) === foodKey(name)).
 * - carbon-footprint tags aren't sent (unused by these views).
 * - hall ids are replaced by an index into `halls`.
 * `fromWire` still accepts v1 (e.g. an offline copy cached by the service worker).
 */

export const WIRE_VERSION = 3;

type Macros = [number, number, number, number, number, number?, number?, number?];

type WireItem = [
  id: string,
  hall: number,
  name: string,
  station: string | null,
  tags: string[],
  macros: Macros,
  mScale: number | null,
  avgRating: number,
  reviewCount: number,
  meals: string[],
  servingSize?: string | null,
  allergens?: string[],
  additives?: string[],
];

export type DayMenuWire = {
  v: 1 | 2 | 3;
  date: string;
  generatedAt: string;
  halls: DayMenuHall[];
  items: WireItem[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function toWire(menu: DayMenu): DayMenuWire {
  const hallIndex = new Map(menu.halls.map((h, i) => [h.id, i]));
  return {
    v: WIRE_VERSION,
    date: menu.date,
    generatedAt: menu.generatedAt,
    halls: menu.halls,
    items: menu.items
      .filter((it) => hallIndex.has(it.hallId))
      .map((it): WireItem => [
        it.id,
        hallIndex.get(it.hallId)!,
        it.name,
        it.station,
        it.tags.filter((t) => !t.toLowerCase().startsWith("carbon")),
        [
          round1(it.macros.calories),
          round1(it.macros.protein),
          round1(it.macros.carbs),
          round1(it.macros.fat),
          round1(it.macros.fiber),
          round1(it.macros.satFat),
          round1(it.macros.sodium),
          round1(it.macros.sugars),
        ],
        it.mScale,
        round1(it.avgRating),
        it.reviewCount,
        it.meals,
        it.servingSize,
        it.allergens,
        it.additives,
      ]),
  };
}

export function fromWire(wire: DayMenuWire): DayMenu {
  if (wire.v !== 1 && wire.v !== 2 && wire.v !== 3) throw new Error(`Unsupported menu format v${String(wire.v)}`);
  const items: DayMenuItem[] = wire.items.map(
    ([id, hall, name, station, tags, m, mScale, avgRating, reviewCount, meals, servingSize, allergens, additives]) => ({
      id,
      hallId: wire.halls[hall].id,
      name,
      key: foodKey(name),
      station,
      tags,
      servingSize: servingSize ?? null,
      macros: {
        calories: m[0],
        protein: m[1],
        carbs: m[2],
        fat: m[3],
        fiber: m[4],
        satFat: m[5] ?? 0,
        sodium: m[6] ?? 0,
        sugars: m[7] ?? 0,
      },
      mScale,
      avgRating,
      reviewCount,
      meals,
      allergens: allergens ?? [],
      additives: additives ?? [],
    }),
  );
  return { date: wire.date, generatedAt: wire.generatedAt, halls: wire.halls, items };
}
