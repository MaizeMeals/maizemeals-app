import type { Json } from "@/types/supabase";

/**
 * Additive highlight categories written by the scraper
 * (scraper/lib/ingredient_highlights.py). Keep keys and order in sync.
 */
export const ADDITIVE_CATEGORIES = {
  seed_oil: { label: "Seed oil", mark: "bg-amber-200/70 text-amber-950 dark:bg-amber-500/25 dark:text-amber-100", dot: "bg-amber-500" },
  palm_oil: { label: "Palm oil", mark: "bg-amber-200/70 text-amber-950 dark:bg-amber-500/25 dark:text-amber-100", dot: "bg-amber-600" },
  hydrogenated_oil: { label: "Hydrogenated oil", mark: "bg-orange-200/70 text-orange-950 dark:bg-orange-500/25 dark:text-orange-100", dot: "bg-orange-500" },
  color: { label: "Food coloring", mark: "bg-pink-200/70 text-pink-950 dark:bg-pink-500/25 dark:text-pink-100", dot: "bg-pink-500" },
  preservative: { label: "Preservative", mark: "bg-red-200/70 text-red-950 dark:bg-red-500/25 dark:text-red-100", dot: "bg-red-500" },
  emulsifier: { label: "Emulsifier", mark: "bg-violet-200/70 text-violet-950 dark:bg-violet-500/25 dark:text-violet-100", dot: "bg-violet-500" },
  sweetener: { label: "Sweetener", mark: "bg-fuchsia-200/70 text-fuchsia-950 dark:bg-fuchsia-500/25 dark:text-fuchsia-100", dot: "bg-fuchsia-500" },
  flavoring: { label: "Flavoring", mark: "bg-sky-200/70 text-sky-950 dark:bg-sky-500/25 dark:text-sky-100", dot: "bg-sky-500" },
  thickener: { label: "Thickener / gum", mark: "bg-teal-200/70 text-teal-950 dark:bg-teal-500/25 dark:text-teal-100", dot: "bg-teal-500" },
  other: { label: "Additive", mark: "bg-muted text-foreground", dot: "bg-muted-foreground" },
} as const;

export type AdditiveCategory = keyof typeof ADDITIVE_CATEGORIES;

const ORDER = Object.keys(ADDITIVE_CATEGORIES) as AdditiveCategory[];

export type IngredientSpan = {
  start: number;
  end: number;
  category: AdditiveCategory;
  /** Specific label, e.g. "Leavening" or "Hydrogenated oil". */
  label: string;
  matched: string;
};

export type IngredientFlags = { categories: AdditiveCategory[]; spans: IngredientSpan[] };

function isCategory(value: unknown): value is AdditiveCategory {
  return typeof value === "string" && value in ADDITIVE_CATEGORIES;
}

/** Validate the jsonb from items.ingredient_flags (defensive: written by Python). */
export function parseIngredientFlags(value: Json | null | undefined, text: string | null | undefined): IngredientFlags | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as { categories?: unknown; spans?: unknown };
  const len = text?.length ?? 0;
  const spans: IngredientSpan[] = Array.isArray(raw.spans)
    ? (raw.spans as Record<string, unknown>[])
        .filter(
          (s) =>
            s &&
            typeof s.start === "number" &&
            typeof s.end === "number" &&
            s.start >= 0 &&
            s.end > s.start &&
            s.end <= len &&
            isCategory(s.category),
        )
        .map((s) => ({
          start: s.start as number,
          end: s.end as number,
          category: s.category as AdditiveCategory,
          label: typeof s.label === "string" ? s.label : ADDITIVE_CATEGORIES[s.category as AdditiveCategory].label,
          matched: typeof s.matched === "string" ? s.matched : "",
        }))
        .sort((a, b) => a.start - b.start)
    : [];
  const categories = sortCategories(
    Array.isArray(raw.categories) ? raw.categories.filter(isCategory) : spans.map((s) => s.category),
  );
  return { categories, spans };
}

export function sortCategories(categories: readonly string[]): AdditiveCategory[] {
  const set = new Set(categories.filter(isCategory));
  return ORDER.filter((c) => set.has(c));
}

/** "2 emulsifiers · seed oil · food coloring" style counts per category. */
export function countByCategory(spans: IngredientSpan[]): { category: AdditiveCategory; count: number }[] {
  const counts = new Map<AdditiveCategory, number>();
  for (const s of spans) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return ORDER.filter((c) => counts.has(c)).map((c) => ({ category: c, count: counts.get(c)! }));
}
