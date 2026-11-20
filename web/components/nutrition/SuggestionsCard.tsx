"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { logFoodItem, type FoodLogEntry } from "@/app/actions/macro-tracker";
import { FoodIcon } from "@/components/ingredients/FoodIcon";
import { INITIAL_FILTERS } from "@/components/locations/slug/filters/types";
import { useDayMenu } from "@/hooks/use-day-menu";
import { usePreferences } from "@/hooks/use-preferences";
import { useAnalytics } from "@/hooks/use-analytics";
import { asScoringItem, easternMinutes, formatClock } from "@/lib/day-menu/scoring";
import { locationKind } from "@/lib/day-menu/dishes";
import { filterItems } from "@/lib/filter-utils";
import { menuMealToFoodLogMeal, type MacroSummary } from "@/lib/nutrition";
import { suggestForRemaining } from "@/lib/nutrition-suggest";
import { toast } from "@/lib/toast";

function mealsLeftNow(minutes: number): number {
  if (minutes < 10 * 60 + 30) return 3;
  if (minutes < 16 * 60 + 30) return 2;
  return 1;
}

/** "What should I eat to hit my targets?" from today's menus. */
export function SuggestionsCard({
  today,
  remaining,
  onLogged,
}: {
  today: string;
  remaining: MacroSummary;
  onLogged: (entry: FoodLogEntry) => void;
}) {
  const { menu, loading } = useDayMenu(today);
  const { preferences, loading: prefsLoading } = usePreferences();
  const { track } = useAnalytics();
  const [adding, setAdding] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (!menu || prefsLoading) return [];
    const filters = { ...INITIAL_FILTERS, dietary: preferences.dietary_filters };
    const include = (it: Parameters<typeof asScoringItem>[0]) =>
      filterItems([asScoringItem(it)], filters, preferences.avoid_ingredients).length > 0;
    const now = easternMinutes();
    return suggestForRemaining(menu, remaining, preferences, {
      nowMinutes: now,
      include,
      mealsLeft: mealsLeftNow(now),
    });
  }, [menu, prefsLoading, preferences, remaining]);

  if (remaining.calories < 150) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        You&apos;re at your calorie target for today.
      </section>
    );
  }

  const add = async (itemId: string, meal: string, name: string) => {
    setAdding(itemId);
    const result = await logFoodItem({ itemId, servings: 1, meal: menuMealToFoodLogMeal(meal), consumedOn: today });
    setAdding(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onLogged(result.data);
    toast.success(`Logged ${name}.`);
    track("macro_suggestion_logged", { item_id: itemId });
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="suggest-heading">
      <div className="border-b border-border px-4 py-3">
        <h2 id="suggest-heading" className="flex items-center gap-2 font-bold">
          <Sparkles className="h-4 w-4 text-maize" aria-hidden /> What to eat next
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {Math.round(remaining.calories).toLocaleString()} cal and {Math.round(Math.max(0, remaining.protein))}g
          protein left today. Dishes still being served that fit.
        </p>
      </div>
      {loading || prefsLoading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking today&apos;s menus…
        </div>
      ) : suggestions.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nothing left on today&apos;s menus fits what you have left.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {suggestions.map(({ offering, calories, protein, reason }) => {
            const { item, hall, meal, window, status } = offering;
            const when =
              status.kind === "now"
                ? window
                  ? `now until ${formatClock(window.end)}`
                  : "now"
                : window
                  ? `from ${formatClock(window.start)}`
                  : "later";
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <FoodIcon name={item.name} className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {hall.name} · {locationKind(hall) ?? meal} {when} · {Math.round(calories)} cal · {Math.round(protein)}g
                    protein
                  </p>
                  <p className="truncate text-xs font-medium text-foreground/80">{reason}</p>
                </div>
                <button
                  type="button"
                  disabled={adding !== null}
                  onClick={() => void add(item.id, meal, item.name)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-maize/60 bg-maize text-umich-blue shadow-sm disabled:opacity-50"
                  aria-label={`Log ${item.name}`}
                >
                  {adding === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
