import { foodKey, type DayMenu, type DayMenuHall, type DayMenuItem } from "./types";

/**
 * Compact transport format for GET /menus/offerings (~40% smaller gzipped
 * than the plain DayMenu JSON, which matters on dining-hall signal). Only the
 * HTTP boundary uses it: the server encodes with `toWire`, `useDayMenu`
 * decodes with `fromWire`, and everything else works with `DayMenu`.
 *
 * Item tuple:
 *   [id, hallIndex, name, station, tags, [cal, protein, carbs, fat, fiber],
 *    mScale, avgRating, reviewCount, meals]
 * - `key` is recomputed from `name` (foodKey(normalized_name) === foodKey(name)).
 * - carbon-footprint tags and serving size aren't sent (unused by these views).
 * - hall ids are replaced by an index into `halls`.
 */

export const WIRE_VERSION = 1;

type WireItem = [
  id: string,
  hall: number,
  name: string,
  station: string | null,
  tags: string[],
  macros: [number, number, number, number, number],
  mScale: number | null,
  avgRating: number,
  reviewCount: number,
  meals: string[],
];

export type DayMenuWire = {
  v: typeof WIRE_VERSION;
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
      .map((it) => [
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
        ],
        it.mScale,
        round1(it.avgRating),
        it.reviewCount,
        it.meals,
      ]),
  };
}

export function fromWire(wire: DayMenuWire): DayMenu {
  if (wire.v !== WIRE_VERSION) throw new Error(`Unsupported menu format v${wire.v}`);
  const items: DayMenuItem[] = wire.items.map(
    ([id, hall, name, station, tags, [calories, protein, carbs, fat, fiber], mScale, avgRating, reviewCount, meals]) => ({
      id,
      hallId: wire.halls[hall].id,
      name,
      key: foodKey(name),
      station,
      tags,
      servingSize: null,
      macros: { calories, protein, carbs, fat, fiber },
      mScale,
      avgRating,
      reviewCount,
      meals,
    }),
  );
  return { date: wire.date, generatedAt: wire.generatedAt, halls: wire.halls, items };
}
