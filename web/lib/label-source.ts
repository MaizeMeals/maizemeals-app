export type LabelMatch = { coverage: "ingredients" | "allergens"; matchedAt: string };

export function matchedLabel(source: unknown, id: string, station: string | null): LabelMatch | null {
  if (!source || typeof source !== "object") return null;
  const row = source as Record<string, unknown>;
  if (!station || row.item_id !== id || row.item_station !== station) return null;
  if (row.coverage !== "ingredients" && row.coverage !== "allergens") return null;
  if (typeof row.matched_at !== "string") return null;
  const age = Date.now() - Date.parse(row.matched_at);
  if (!Number.isFinite(age) || age < 0 || age >= 14 * 86400000) return null;
  return { coverage: row.coverage, matchedAt: row.matched_at };
}

export function itemLabelMatch(item: { id: string; station: string | null; nutrition_label: unknown }) {
  const label = item.nutrition_label as { source?: unknown } | null;
  return matchedLabel(label?.source, item.id, item.station);
}
