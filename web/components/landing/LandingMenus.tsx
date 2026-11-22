"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Star } from "lucide-react"
import { useDayMenu } from "@/hooks/use-day-menu"
import { usePreferences } from "@/hooks/use-preferences"
import { useFavoriteFoods } from "@/hooks/use-favorite-foods"
import { buildDishes, mealsOnMenu, type Dish } from "@/lib/day-menu/dishes"
import { defaultMealForNow, easternDate, easternMinutes, easternToday } from "@/lib/day-menu/scoring"
import type { DayMenu, DayMenuItem } from "@/lib/day-menu/types"
import { normalizeDietaryTag } from "@/lib/filter-utils"
import { shortHallName } from "@/lib/schedule-notice"
import { FoodIcon } from "@/components/ingredients/FoodIcon"
import { DietaryTag } from "@/components/locations/slug/DietaryTags"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Sides and condiments that would crowd out actual dishes. */
const NOT_A_DISH = /\b(sauce|dressing|syrup|gravy|condiments?|toppings?|salsa|butter|jam|jelly|ketchup|mustard|mayo|relish|croutons|sprinkles|cream cheese|hummus|guacamole|dinner rolls?|assorted rolls|bread|tortillas?|fries)\b/i

const FILTERS = [
  { id: "all", label: "All" },
  { id: "highprotein", label: "High protein" },
  { id: "vegan", label: "Vegan" },
  { id: "glutenfree", label: "Gluten free" },
  { id: "halal", label: "Halal" },
] as const
type FilterId = (typeof FILTERS)[number]["id"]
type SortId = "picks" | "fits" | "protein" | "calories"

function isWeekend(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number)
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  return day === 0 || day === 6
}

/** Same rule as the app's "High Protein" tag (filter-utils getDynamicTags). */
function itemTags(item: DayMenuItem): string[] {
  const tags = item.tags.map(normalizeDietaryTag)
  const { calories, protein } = item.macros
  if (calories >= 25 && protein / calories >= 0.085) tags.push("highprotein")
  return tags
}

type MealPick = { date: string; meal: string; dishes: Dish[]; when: string }

/** The meal being served now, else the next one today, else tomorrow's first. */
function pickMeal(today: DayMenu | null, tomorrow: DayMenu | null, prefs: Parameters<typeof buildDishes>[1]): MealPick | null {
  const now = easternMinutes()
  const tryMenu = (menu: DayMenu | null, isToday: boolean): MealPick | null => {
    if (!menu) return null
    const meals = mealsOnMenu(menu, false)
    if (meals.length === 0) return null
    const guess = isToday ? defaultMealForNow(now, isWeekend(menu.date)) : meals[0]
    const start = Math.max(0, meals.indexOf(guess))
    for (const meal of meals.slice(start)) {
      const dishes = buildDishes(menu, prefs, {
        query: "",
        meal,
        include: (it) => it.macros.calories >= 120 && !NOT_A_DISH.test(it.name),
        includeRetail: false,
        nowMinutes: isToday ? now : null,
      }).filter((d) => !isToday || d.offerings.some((o) => o.status.kind !== "ended"))
      if (dishes.length > 0) {
        return { date: menu.date, meal, dishes, when: `${meal} ${isToday ? "today" : "tomorrow"}` }
      }
    }
    return null
  }
  return tryMenu(today, true) ?? tryMenu(tomorrow, false)
}

function useLandingMenus() {
  const today = easternToday()
  const tomorrow = easternDate(1)
  const { preferences, loading: prefsLoading } = usePreferences()
  const todayMenu = useDayMenu(today)
  const tomorrowMenu = useDayMenu(tomorrow)
  const loading = prefsLoading || todayMenu.loading || tomorrowMenu.loading
  const pick = useMemo(
    () => (loading ? null : pickMeal(todayMenu.menu, tomorrowMenu.menu, preferences)),
    [loading, todayMenu.menu, tomorrowMenu.menu, preferences],
  )
  return { loading, pick, todayMenu: todayMenu.menu, preferences, error: todayMenu.error }
}

function dishHref(dish: Dish, date: string): string {
  const o = dish.offerings[0]
  return `/locations/${o.hall.slug}?date=${date}&item=${encodeURIComponent(o.item.id)}`
}

function hallLine(dish: Dish): string {
  const names = [...new Set(dish.offerings.map((o) => shortHallName(o.hall.name)))]
  return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0]
}

function DishTile({ dish, date }: { dish: Dish; date: string }) {
  const item = dish.primary
  const tags = itemTags(item).filter((t) => FILTERS.some((f) => f.id === t)).slice(0, 2)
  return (
    <Link
      href={dishHref(dish, date)}
      className="group flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md md:w-auto"
    >
      <span className="flex h-24 items-center justify-center bg-muted/60 md:h-28">
        <FoodIcon name={item.name} className="h-12 w-12 transition-transform group-hover:scale-105 md:h-14 md:w-14" />
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3 md:p-4">
        <span className="line-clamp-2 text-sm font-bold leading-snug text-foreground md:text-[15px]">{dish.name}</span>
        <span className="truncate text-xs text-muted-foreground md:text-sm">{hallLine(dish)}</span>
        <span className="text-xs tabular-nums text-foreground/80 md:text-[13px]">
          {Math.round(item.macros.calories)} cal · {Math.round(item.macros.protein)} g protein
        </span>
        {dish.bestRating && dish.bestRating.count > 0 ? (
          <span className="flex items-center gap-1 text-xs text-foreground/80">
            <Star className="h-3.5 w-3.5 fill-maize text-maize" aria-hidden />
            <strong className="text-foreground">{dish.bestRating.value.toFixed(1)}</strong>
            <span className="text-muted-foreground">
              · {dish.bestRating.count} review{dish.bestRating.count === 1 ? "" : "s"}
            </span>
          </span>
        ) : null}
        {tags.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {tags.map((t) => (
              <DietaryTag key={t} tag={t} alwaysShowLabel />
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

/**
 * "Good right now": dishes at the dining halls for the meal being served,
 * with diet filters and a way to prioritize. Signed-in users with a food log
 * today can sort by what fits their remaining calories.
 */
export function GoodRightNow({ remaining }: { remaining: { calories: number; protein: number } | null }) {
  const { loading, pick, error } = useLandingMenus()
  const [filter, setFilter] = useState<FilterId>("all")
  const [sort, setSort] = useState<SortId>(remaining ? "fits" : "picks")

  const dishes = useMemo(() => {
    if (!pick) return []
    let list = pick.dishes
    if (filter !== "all") list = list.filter((d) => itemTags(d.primary).includes(filter))
    const ratio = (d: Dish) => d.primary.macros.protein / Math.max(1, d.primary.macros.calories)
    if (sort === "protein") list = [...list].sort((a, b) => b.primary.macros.protein - a.primary.macros.protein)
    if (sort === "calories") list = [...list].sort((a, b) => a.primary.macros.calories - b.primary.macros.calories)
    if (sort === "fits" && remaining) {
      list = [...list]
        .filter((d) => d.primary.macros.calories <= Math.max(remaining.calories, 0) + 50)
        .sort((a, b) => ratio(b) - ratio(a))
    }
    return list.slice(0, 6)
  }, [pick, filter, sort, remaining])

  if (error && !pick) return null

  return (
    <section aria-labelledby="good-now-heading" className="mx-auto max-w-6xl pt-10 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-4">
        <div>
          <h2 id="good-now-heading" className="font-heading text-2xl font-bold text-umich-blue dark:text-white md:text-3xl">
            Good right now
          </h2>
          {pick ? <p className="mt-1 text-sm text-muted-foreground">{pick.when} at the dining halls</p> : null}
        </div>
        <Link href="/menus" className="text-sm font-semibold text-umich-blue hover:underline dark:text-maize">
          See everything in Find food
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:flex-wrap md:overflow-visible md:px-0" aria-label="Filter dishes">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                filter === f.id
                  ? "border-umich-blue bg-umich-blue text-white dark:border-maize dark:bg-maize dark:text-umich-blue"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 px-4 text-sm text-muted-foreground md:px-0">
          Prioritize
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground"
          >
            {remaining ? <option value="fits">Fits my macros</option> : null}
            <option value="picks">{pick?.meal ?? "Meal"} picks</option>
            <option value="protein">Most protein</option>
            <option value="calories">Fewest calories</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 w-44 shrink-0 rounded-2xl md:w-auto" />)
          : dishes.map((d) => <DishTile key={d.key} dish={d} date={pick!.date} />)}
      </div>
      {!loading && pick && dishes.length === 0 ? (
        <p className="px-4 pt-2 text-sm text-muted-foreground">Nothing matching that right now. Try another filter.</p>
      ) : null}
      {!loading && !pick ? (
        <p className="px-4 pt-2 text-sm text-muted-foreground">No dining hall menus are posted for today or tomorrow yet.</p>
      ) : null}
    </section>
  )
}

/** Favorited dishes on today's menus (signed in or not; favorites sync per account). */
export function FavoritesToday() {
  const { favorites } = useFavoriteFoods()
  const { todayMenu, preferences } = useLandingMenus()

  const hits = useMemo(() => {
    if (!todayMenu || favorites.size === 0) return []
    const out: { dish: Dish; meal: string }[] = []
    const seen = new Set<string>()
    for (const meal of mealsOnMenu(todayMenu, true)) {
      const dishes = buildDishes(todayMenu, preferences, {
        query: "",
        meal,
        include: () => true,
        includeRetail: true,
        nowMinutes: easternMinutes(),
      })
      for (const d of dishes) {
        if (seen.has(d.key) || !d.memberKeys.some((k) => favorites.has(k))) continue
        seen.add(d.key)
        out.push({ dish: d, meal })
      }
    }
    return out.slice(0, 4)
  }, [todayMenu, favorites, preferences])

  if (hits.length === 0) return null

  return (
    <section aria-labelledby="favorites-today-heading" className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex items-baseline justify-between">
        <h2 id="favorites-today-heading" className="font-heading text-xl font-bold text-umich-blue dark:text-white">
          Your favorites today
        </h2>
        <Link href="/menus" className="text-sm font-semibold text-umich-blue hover:underline dark:text-maize">
          Find food
        </Link>
      </div>
      <ul className="mt-3 grid gap-2.5 md:grid-cols-2">
        {hits.map(({ dish, meal }) => (
          <li key={dish.key}>
            <Link
              href={dishHref(dish, todayMenu!.date)}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                <FoodIcon name={dish.name} className="h-7 w-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{dish.name}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {hallLine(dish)} · {meal}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
