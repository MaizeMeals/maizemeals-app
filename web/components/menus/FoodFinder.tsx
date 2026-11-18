"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, SearchX, Store } from "lucide-react";
import { HEADER_HEIGHT } from "@/components/layout/constants";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SearchField } from "@/components/ui/search-field";
import { DateControls } from "@/components/locations/slug/DateControls";
import { FilterDialog } from "@/components/locations/slug/FilterDialog";
import { MenuTabs } from "@/components/locations/slug/MenuTabs";
import { QuickToggles } from "@/components/locations/slug/QuickToggles";
import { INITIAL_FILTERS, type FilterState } from "@/components/locations/slug/filters/types";
import { usePreferences } from "@/hooks/use-preferences";
import { useDayMenu } from "@/hooks/use-day-menu";
import { useAnalytics } from "@/hooks/use-analytics";
import { appToolbarControlClassName } from "@/lib/button-styles";
import { filterItems } from "@/lib/filter-utils";
import { buildDishes, mealsOnMenu } from "@/lib/day-menu/dishes";
import { isDiningHall } from "@/lib/day-menu/match";
import {
  asScoringItem,
  defaultMealForNow,
  easternDate,
  easternMinutes,
  easternToday,
} from "@/lib/day-menu/scoring";
import type { DayMenuItem } from "@/lib/day-menu/types";
import { DishCard } from "./DishCard";
import { FavoritesSection } from "./FavoritesSection";
import { DishDrawer, DishSidebar, useDishItem, type DishSelection } from "./DishDetail";
import { ReviewModal } from "@/components/locations/detail-panel/ReviewModal";
import { useLgUp } from "@/hooks/use-lg-up";
import { cn } from "@/lib/utils";
import type { ItemWithPhotos } from "@/types/dining";
import type { Offering } from "@/lib/day-menu/dishes";
import { useFavoriteFoods } from "@/hooks/use-favorite-foods";

const PAGE = 30;
const DAYS_AHEAD = 6;
const ANY_MEAL = "Any meal";
const CRAVINGS = ["Pizza", "Chicken", "Pasta", "Burger", "Tacos", "Salad", "Rice", "Cookie", "Eggs", "Soup"];

function isWeekend(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Item-based browsing: "I know what I want — where is it today?"
 * Every dish served on a date, grouped across locations, with each
 * location's own rating and serving window, ranked by Smart Preferences.
 *
 * The toolbar deliberately reuses the hall menu's controls (search, date,
 * filters, dietary chips, meal tabs) so both views behave the same.
 */
export function FoodFinder() {
  const searchParams = useSearchParams();
  const { track } = useAnalytics();
  const { preferences, loading: prefsLoading, isGuest } = usePreferences();
  const { favorites } = useFavoriteFoods();

  const today = easternToday();
  const dates = useMemo(
    () => Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => easternDate(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today],
  );

  const [date, setDate] = useState(() => {
    const d = searchParams.get("date");
    return d && dates.includes(d) ? d : today;
  });
  const [meal, setMeal] = useState<string | null>(() => searchParams.get("meal"));
  const [includeRetail, setIncludeRetail] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    search: searchParams.get("q") ?? "",
  }));
  const [prefsApplied, setPrefsApplied] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [selection, setSelection] = useState<DishSelection | null>(null);
  const [reviewItem, setReviewItem] = useState<ItemWithPhotos | null>(null);
  const dishItem = useDishItem(selection);
  const lgUp = useLgUp();
  const query = filters.search;

  // Start from the profile's dealbreakers; chip changes here stay page-local.
  useEffect(() => {
    if (prefsLoading || prefsApplied) return;
    setFilters((f) => ({ ...f, dietary: preferences.dietary_filters }));
    setPrefsApplied(true);
  }, [prefsLoading, prefsApplied, preferences.dietary_filters]);

  const { menu, loading, error } = useDayMenu(date);
  const isToday = date === today;
  const nowMinutes = isToday ? easternMinutes() : null;

  const visibleItems = useMemo(() => {
    if (!menu) return [];
    const halls = new Map(menu.halls.map((h) => [h.id, h]));
    return menu.items.filter((it) => {
      const hall = halls.get(it.hallId);
      return hall && (includeRetail || isDiningHall(hall));
    });
  }, [menu, includeRetail]);
  // FilterDialog derives its macro slider ranges from these.
  const scoringItems = useMemo(() => visibleItems.map(asScoringItem), [visibleItems]);

  const mealOptions = useMemo(() => (menu ? mealsOnMenu(menu, includeRetail) : []), [menu, includeRetail]);
  const effectiveMeal = useMemo(() => {
    if (meal && (meal === ANY_MEAL || mealOptions.includes(meal))) return meal;
    if (!mealOptions.length) return ANY_MEAL;
    // Searching answers "where/when is it served?" — look across every meal.
    if (query.trim()) return ANY_MEAL;
    if (isToday) {
      const guess = defaultMealForNow(nowMinutes ?? 0, isWeekend(date));
      if (mealOptions.includes(guess)) return guess;
    }
    return mealOptions.find((m) => m !== "All Day") ?? ANY_MEAL;
  }, [meal, mealOptions, isToday, nowMinutes, date, query]);

  const dishes = useMemo(() => {
    if (!menu || !prefsApplied) return [];
    // Same predicate as the hall page (dietary + rating/M-Scale/macros); text
    // search is handled by buildDishes' relevance ranking instead.
    const nonSearch = { ...filters, search: "" };
    const include = (it: DayMenuItem) => filterItems([asScoringItem(it)], nonSearch).length > 0;
    return buildDishes(menu, preferences, {
      query,
      meal: effectiveMeal === ANY_MEAL ? "Any" : effectiveMeal,
      include,
      includeRetail,
      nowMinutes,
    });
    // nowMinutes intentionally omitted: recomputed when inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, preferences, prefsApplied, filters, query, effectiveMeal, includeRetail]);

  // Shareable URL (?q=&date=&meal=). history.replaceState, not router.replace,
  // so typing doesn't cause server round-trips; Next syncs useSearchParams.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (date !== today) params.set("date", date);
    if (meal) params.set("meal", meal);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/menus?${qs}` : "/menus");
  }, [query, date, meal, today]);

  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(
      () => track("food_search", { query: query.trim().toLowerCase(), results: dishes.length, date_offset: dates.indexOf(date) }),
      800,
    );
    return () => clearTimeout(t);
  }, [query, dishes.length, date, dates, track]);

  useEffect(() => setLimit(PAGE), [filters, date, effectiveMeal, includeRetail]);

  // Without a search, favorites get their own section above the ranked list.
  const showFavorites = !query.trim() && favorites.size > 0;
  const favoriteDishes = useMemo(
    () => (showFavorites ? dishes.filter((d) => favorites.has(d.key)) : []),
    [showFavorites, dishes, favorites],
  );
  const listDishes = useMemo(
    () => (showFavorites ? dishes.filter((d) => !favorites.has(d.key)) : dishes),
    [showFavorites, dishes, favorites],
  );

  const openOffering = (o: Offering) => {
    track("find_food_item_opened", { hall: o.hall.slug, food_key: o.item.key });
    setSelection({
      itemId: o.item.id,
      hallName: o.hall.name,
      hallSlug: o.hall.slug,
      date,
      isToday,
      provisional: asScoringItem(o.item),
    });
  };

  const toggleDietary = (id: string) =>
    setFilters((f) => ({
      ...f,
      dietary: f.dietary.includes(id) ? f.dietary.filter((t) => t !== id) : [...f.dietary, id],
    }));

  const activeFilterCount =
    filters.dietary.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minMScale > 1 ? 1 : 0);

  const cravings = useMemo(() => {
    const names = visibleItems.map((i) => i.name.toLowerCase());
    return CRAVINGS.filter((c) => names.some((n) => n.includes(c.toLowerCase()))).slice(0, 8);
  }, [visibleItems]);

  return (
    // lg+: the item panel sits beside the page and the content shifts over
    // (same pattern and widths as the hall menu), instead of a blocking overlay.
    <div className="lg:flex lg:w-full lg:items-start">
    <PageShell className="min-w-0 px-0 md:px-0 lg:flex-1">
      <div className="px-4">
        <PageHeader
          title="Find food"
          description="Search everything on the menu across campus and see where it's served."
        />
      </div>

      {/* Same toolbar anatomy as the hall menu (StickyHeader + MenuTabs). */}
      <div className="sticky z-20 border-b border-border bg-background" style={{ top: HEADER_HEIGHT }}>
        <div className="space-y-3 px-4 pb-2 pt-2">
          <div className="flex gap-2">
            <SearchField
              value={query}
              onValueChange={(search) => setFilters((f) => ({ ...f, search }))}
              placeholder="What are you craving?"
            />
            <DateControls
              selectedDate={date}
              onDateChange={(d) => {
                setDate(d);
                setMeal(null);
              }}
              availableDates={dates}
              loading={loading}
            />
            <Button
              variant="outline"
              className={appToolbarControlClassName(includeRetail)}
              aria-pressed={includeRetail}
              onClick={() => setIncludeRetail((v) => !v)}
              title="Include cafés & markets"
            >
              <Store className="h-4 w-4" />
              <span className="hidden md:inline">Cafés</span>
            </Button>
            <FilterDialog
              filters={filters}
              setFilters={setFilters}
              items={scoringItems}
              activeCount={activeFilterCount}
              resultCount={dishes.length}
            />
          </div>
          <QuickToggles selected={filters.dietary} onChange={toggleDietary} />
        </div>
        {mealOptions.length > 0 && (
          <MenuTabs meals={[...mealOptions, ANY_MEAL]} activeTab={effectiveMeal} onTabChange={setMeal} />
        )}
      </div>

      <div className="px-4">
        {!query && cravings.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Popular searches">
            {cravings.map((c) => (
              <Button
                key={c}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setFilters((f) => ({ ...f, search: c }))}
              >
                {c}
              </Button>
            ))}
          </div>
        )}

        {showFavorites && !loading && menu && (
          <FavoritesSection
            favorites={favorites}
            dishes={favoriteDishes}
            date={date}
            isToday={isToday}
            onSelectOffering={openOffering}
          />
        )}

        <section className="mt-4" aria-live="polite" data-testid="food-results">
          {loading || !prefsApplied ? (
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading menus…
            </div>
          ) : error ? (
            <NoResults title="Couldn't load menus" body="Check your connection and try again." />
          ) : !menu || menu.items.length === 0 ? (
            <NoResults
              title="No menus posted"
              body="Dining halls haven't published menus for this day yet — breaks and holidays often have none."
            />
          ) : listDishes.length === 0 && favoriteDishes.length === 0 ? (
            <NoResults
              title={query ? `No “${query}” ${isToday ? "today" : "that day"}` : "Nothing matches"}
              body="Try another meal or day, include cafés & markets, or loosen your filters."
            />
          ) : (
            <>
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {showFavorites ? "Everything else · " : ""}
                {listDishes.length} {listDishes.length === 1 ? "dish" : "dishes"}
                {!query && !prefsLoading && !isGuest && " · ranked for your preferences"}
                {!query && !prefsLoading && isGuest && (
                  <>
                    {" · "}
                    <Link
                      href="/signup?next=%2Fmenus"
                      onClick={() => track("find_food_signup_cta_clicked")}
                      className="font-semibold text-foreground underline underline-offset-2 hover:text-maize"
                    >
                      Sign up to personalize these picks
                    </Link>
                  </>
                )}
              </p>
              <div className="space-y-3">
                {listDishes.slice(0, limit).map((dish) => (
                  <DishCard key={dish.key} dish={dish} date={date} isToday={isToday} onSelectOffering={openOffering} />
                ))}
              </div>
              {listDishes.length > limit && (
                <Button
                  variant="outline"
                  className="mt-4 w-full rounded-full"
                  onClick={() => setLimit((l) => l + PAGE)}
                >
                  Show more ({listDishes.length - limit})
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </PageShell>

      <aside
        className={cn(
          "hidden lg:sticky lg:top-16 lg:z-10 lg:shrink-0 lg:overflow-hidden lg:bg-background lg:transition-[width,min-width] lg:duration-300 lg:ease-out motion-reduce:lg:transition-none",
          selection
            ? "lg:flex lg:w-[min(420px,38vw)] lg:min-w-[280px] lg:border-l lg:border-border lg:shadow-md"
            : "lg:w-0 lg:min-w-0 lg:border-l lg:border-transparent",
        )}
        aria-hidden={!selection}
        aria-label={selection ? "Dish details" : undefined}
      >
        {lgUp && selection ? (
          <div className="flex h-[calc(100vh-4rem)] min-h-[28rem] w-[min(420px,38vw)] min-w-[280px] flex-col">
            <DishSidebar
              selection={selection}
              state={dishItem}
              onClose={() => setSelection(null)}
              onStartReview={setReviewItem}
            />
          </div>
        ) : null}
      </aside>

      {!lgUp && (
        <DishDrawer
          selection={selection}
          state={dishItem}
          onClose={() => setSelection(null)}
          onStartReview={setReviewItem}
        />
      )}

      {reviewItem && (
        <ReviewModal
          itemId={reviewItem.id}
          itemName={reviewItem.name}
          open
          onOpenChange={(open) => !open && setReviewItem(null)}
        />
      )}
    </div>
  );
}

function NoResults({ title, body }: { title: string; body: string }) {
  return (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
