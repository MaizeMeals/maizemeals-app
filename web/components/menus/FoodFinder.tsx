"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search, SearchX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEADER_HEIGHT } from "@/components/layout/constants";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DIETARY_IDS } from "@/components/locations/slug/DietaryTags";
import { DietaryFilterButton } from "@/components/locations/slug/filters/DietaryFilterButton";
import { usePreferences } from "@/hooks/use-preferences";
import { useDayMenu } from "@/hooks/use-day-menu";
import { useAnalytics } from "@/hooks/use-analytics";
import { buildDishes, mealsOnMenu } from "@/lib/day-menu/dishes";
import {
  defaultMealForNow,
  easternDate,
  easternMinutes,
  easternToday,
} from "@/lib/day-menu/scoring";
import { DishCard } from "./DishCard";

const PAGE = 30;
const DAYS_AHEAD = 6;
const CRAVINGS = ["Pizza", "Chicken", "Pasta", "Burger", "Tacos", "Salad", "Rice", "Cookie", "Eggs", "Soup"];

function dayLabel(date: string, offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function isWeekend(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Item-based browsing: "I know what I want — where is it today?"
 * Every dish served on a date, grouped across locations, with each
 * location's own rating and serving window, ranked by the user's
 * Smart Preferences.
 */
export function FoodFinder() {
  const searchParams = useSearchParams();
  const { track } = useAnalytics();
  const { preferences, loading: prefsLoading } = usePreferences();

  const today = easternToday();
  const dates = useMemo(
    () => Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => easternDate(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today],
  );

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [date, setDate] = useState(() => {
    const d = searchParams.get("date");
    return d && dates.includes(d) ? d : today;
  });
  const [meal, setMeal] = useState<string | null>(() => searchParams.get("meal"));
  const [includeRetail, setIncludeRetail] = useState(false);
  const [filters, setFilters] = useState<string[] | null>(null);
  const [limit, setLimit] = useState(PAGE);

  // Hard filters start from the profile's dealbreakers; chip changes here are page-local.
  useEffect(() => {
    if (!prefsLoading && filters === null) setFilters(preferences.dietary_filters);
  }, [prefsLoading, filters, preferences.dietary_filters]);

  const { menu, loading, error } = useDayMenu(date);
  const isToday = date === today;
  const nowMinutes = isToday ? easternMinutes() : null;

  const mealOptions = useMemo(() => (menu ? mealsOnMenu(menu, includeRetail) : []), [menu, includeRetail]);
  const effectiveMeal = useMemo(() => {
    if (meal && (meal === "Any" || mealOptions.includes(meal))) return meal;
    if (!mealOptions.length) return "Any";
    // Searching answers "where/when is it served?" — look across every meal.
    if (query.trim()) return "Any";
    if (isToday) {
      const guess = defaultMealForNow(nowMinutes ?? 0, isWeekend(date));
      if (mealOptions.includes(guess)) return guess;
    }
    return mealOptions.find((m) => m !== "All Day") ?? "Any";
  }, [meal, mealOptions, isToday, nowMinutes, date, query]);

  const dishes = useMemo(() => {
    if (!menu || filters === null) return [];
    return buildDishes(menu, preferences, {
      query,
      meal: effectiveMeal,
      filters,
      includeRetail,
      nowMinutes,
    });
    // nowMinutes intentionally omitted: recomputed when inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, preferences, query, effectiveMeal, filters, includeRetail]);

  // Keep the URL shareable (?q=&date=&meal=) without adding history entries.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (date !== today) params.set("date", date);
    if (meal) params.set("meal", meal);
    const qs = params.toString();
    // history.replaceState (not router.replace) so typing doesn't trigger
    // server round-trips; Next keeps useSearchParams in sync with it.
    window.history.replaceState(null, "", qs ? `/menus?${qs}` : "/menus");
  }, [query, date, meal, today]);

  // Debounced search analytics.
  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(
      () => track("food_search", { query: query.trim().toLowerCase(), results: dishes.length, date_offset: dates.indexOf(date) }),
      800,
    );
    return () => clearTimeout(t);
  }, [query, dishes.length, date, dates, track]);

  useEffect(() => setLimit(PAGE), [query, date, effectiveMeal, filters, includeRetail]);

  const toggleFilter = (id: string) =>
    setFilters((prev) => {
      const cur = prev ?? [];
      return cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id];
    });

  const cravings = useMemo(() => {
    if (!menu) return [];
    const names = menu.items.map((i) => i.name.toLowerCase());
    return CRAVINGS.filter((c) => names.some((n) => n.includes(c.toLowerCase()))).slice(0, 8);
  }, [menu]);

  const mealSegments = [
    ...mealOptions.map((m) => ({ value: m, label: m === "All Day" ? "All day" : m })),
    { value: "Any", label: "Any" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10" style={{ paddingTop: `calc(${HEADER_HEIGHT} + 1.25rem)` }}>
      <header className="mb-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Find food</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search everything on the menu across campus and see where it&apos;s served.
        </p>
      </header>

      <div className="sticky z-20 -mx-4 space-y-3 border-b border-border/60 bg-background/95 px-4 pb-3 pt-1 backdrop-blur-md" style={{ top: HEADER_HEIGHT }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you craving?"
            aria-label="Search dishes"
            className="h-11 w-full rounded-full border border-transparent bg-muted pl-10 pr-10 text-base outline-none transition-colors focus:border-muted-foreground/40 md:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-background"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Day">
          {dates.map((d, i) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === date}
              onClick={() => {
                setDate(d);
                setMeal(null);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                d === date
                  ? "border-umich-blue bg-umich-blue text-white dark:border-maize dark:bg-maize dark:text-umich-blue"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {dayLabel(d, i)}
            </button>
          ))}
        </div>

        {mealOptions.length > 0 && (
          <SegmentedControl label="Meal" options={mealSegments} value={effectiveMeal} onChange={setMeal} />
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {DIETARY_IDS.map((id) => (
            <DietaryFilterButton
              key={id}
              id={id}
              variant="small"
              isSelected={(filters ?? []).includes(id)}
              onClick={() => toggleFilter(id)}
            />
          ))}
          <button
            type="button"
            aria-pressed={includeRetail}
            onClick={() => setIncludeRetail((v) => !v)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
              includeRetail
                ? "border-maize bg-maize/20 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            + Cafés &amp; markets
          </button>
        </div>
      </div>

      {!query && cravings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Popular searches">
          {cravings.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setQuery(c)}
              className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium hover:border-maize hover:bg-maize/10"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <section className="mt-4" aria-live="polite">
        {loading || filters === null ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading menus…
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load menus" body="Check your connection and try again." />
        ) : !menu || menu.items.length === 0 ? (
          <EmptyState
            title="No menus posted"
            body="Dining halls haven't published menus for this day yet — breaks and holidays often have none."
          />
        ) : dishes.length === 0 ? (
          <EmptyState
            title={query ? `No “${query}” ${effectiveMeal === "Any" ? "" : `at ${effectiveMeal.toLowerCase()} `}${isToday ? "today" : "that day"}` : "Nothing matches"}
            body={
              (filters ?? []).length
                ? "Try another meal or day, or loosen your dietary filters."
                : "Try another meal or day, or include cafés & markets."
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              {dishes.length} {dishes.length === 1 ? "dish" : "dishes"}
              {query ? "" : " · ranked for your preferences"}
            </p>
            <div className="space-y-3">
              {dishes.slice(0, limit).map((dish) => (
                <DishCard key={dish.key} dish={dish} date={date} isToday={isToday} />
              ))}
            </div>
            {dishes.length > limit && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="mt-4 w-full rounded-full border border-border bg-card py-2.5 text-sm font-semibold hover:bg-muted/60"
              >
                Show more ({dishes.length - limit})
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground/50" aria-hidden />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
