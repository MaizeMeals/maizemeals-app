import type { DayMenu, DayMenuHall, DayMenuItem } from "./types";
import {
  currentOrNextShift,
  itemFit,
  itemTags,
  passesFilters,
  type ScoringPrefs,
  type ShiftState,
} from "./scoring";

/**
 * Hall Match Score (design doc §2): for each dining hall's current/next meal,
 *   1. drop items that violate the user's hard filters ("Require"),
 *   2. rate the rest with itemFit (protein / M-Scale / ratings weighted by the
 *      user's sliders; MaizeMacros favorites count as near-perfect),
 *   3. blend into an explainable 0–100 match:
 *        60% fit       — mean itemFit of the hall's 5 best picks for you
 *        40% variety   — how many items you can eat (log scale, ~40 = full)
 *      (Dealbreakers already shrink variety; they aren't penalized twice.)
 * Halls where nothing passes your dealbreakers score 0.
 */

export type HallMatch = {
  hallId: string;
  /** 0–100 */
  score: number;
  meal: string;
  state: Extract<ShiftState, { kind: "open" | "upcoming" }>;
  eligibleCount: number;
  totalCount: number;
  reasons: string[];
  topItem: { id: string; name: string; rating: number | null } | null;
};

const TOP_N = 5;
const VARIETY_FULL = 40;

const FILTER_LABELS: Record<string, string> = {
  vegan: "vegan",
  vegetarian: "vegetarian",
  halal: "halal",
  kosher: "kosher",
  glutenfree: "gluten-free",
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function isDiningHall(hall: DayMenuHall): boolean {
  return (hall.type ?? "").toUpperCase() === "DINING HALLS";
}

export function computeHallMatches(
  menu: DayMenu,
  prefs: ScoringPrefs,
  nowMinutes: number,
): Map<string, HallMatch> {
  const byHall = new Map<string, DayMenuItem[]>();
  for (const it of menu.items) {
    const list = byHall.get(it.hallId) ?? [];
    list.push(it);
    byHall.set(it.hallId, list);
  }

  const boosted = prefs.implicit_traits.boosted_item_ids;
  const results = new Map<string, HallMatch>();

  for (const hall of menu.halls) {
    if (!isDiningHall(hall)) continue;
    const state = currentOrNextShift(hall, nowMinutes);
    if (state.kind === "closed") continue;

    const mealItems = (byHall.get(hall.id) ?? []).filter((it) => it.meals.includes(state.meal));
    if (mealItems.length === 0) continue;

    const eligible = mealItems
      .filter((it) => passesFilters(it, prefs.dietary_filters))
      .map((it) => ({ it, s: itemFit(it, prefs) }))
      .sort((a, b) => b.s - a.s);

    if (eligible.length === 0) {
      results.set(hall.id, {
        hallId: hall.id,
        score: 0,
        meal: state.meal,
        state,
        eligibleCount: 0,
        totalCount: mealItems.length,
        reasons: ["Nothing matches your dealbreakers"],
        topItem: null,
      });
      continue;
    }

    const top = eligible.slice(0, TOP_N);
    const fit = top.reduce((sum, { s }) => sum + s, 0) / top.length;
    const variety = clamp01(Math.log1p(eligible.length) / Math.log1p(VARIETY_FULL));
    const rated = eligible.filter(({ it }) => it.reviewCount > 0);

    const score = Math.round(100 * (0.6 * fit + 0.4 * variety));

    // Reasons, most persuasive first; the UI shows the first two.
    const reasons: string[] = [];
    const usual = eligible.find(({ it }) => boosted[it.id]);
    if (usual) reasons.push(`Your usual: ${usual.it.name}`);
    const bestRated = rated
      .filter(({ it }) => it.avgRating >= 4)
      .sort((a, b) => b.it.avgRating - a.it.avgRating)[0];
    if (bestRated) reasons.push(`★ ${bestRated.it.avgRating.toFixed(1)} ${bestRated.it.name}`);
    if (prefs.protein_priority > 70) {
      const n = eligible.filter(({ it }) => it.macros.protein > 20).length;
      if (n) reasons.push(`${n} high-protein ${n === 1 ? "dish" : "dishes"}`);
    }
    if (prefs.health_focus > 70) {
      const n = eligible.filter(({ it }) => (it.mScale ?? 0) > 4).length;
      if (n) reasons.push(`${n} nutrient-dense ${n === 1 ? "pick" : "picks"}`);
    }
    const filterLabel = prefs.dietary_filters
      .map((f) => FILTER_LABELS[f.toLowerCase().replace(/[^a-z]/g, "")])
      .filter(Boolean)
      .join(" + ");
    reasons.push(
      filterLabel
        ? `${eligible.length} ${filterLabel} ${eligible.length === 1 ? "option" : "options"}`
        : `${eligible.length} ${eligible.length === 1 ? "option" : "options"}`,
    );
    if (!prefs.dietary_filters.length) {
      const veg = eligible.filter(({ it }) => itemTags(it).includes("vegetarian") || itemTags(it).includes("vegan")).length;
      if (veg >= 3) reasons.push(`${veg} vegetarian`);
    }

    const best = eligible[0].it;
    results.set(hall.id, {
      hallId: hall.id,
      score,
      meal: state.meal,
      state,
      eligibleCount: eligible.length,
      totalCount: mealItems.length,
      reasons,
      topItem: {
        id: best.id,
        name: best.name,
        rating: best.reviewCount > 0 ? best.avgRating : null,
      },
    });
  }

  return results;
}
