"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Heart } from "lucide-react";
import { SectionHeader } from "@/components/layout/page-shell";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import type { Dish, Offering } from "@/lib/day-menu/dishes";
import { easternDate } from "@/lib/day-menu/scoring";
import type { UpcomingFavorite } from "@/lib/day-menu/types";
import { DishCard } from "./DishCard";

function relativeDay(date: string): string {
  if (date === easternDate(0)) return "Today";
  if (date === easternDate(1)) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function useUpcoming(keys: string[]) {
  const [upcoming, setUpcoming] = useState<UpcomingFavorite[] | null>(null);
  const signature = keys.slice().sort().join("|");
  useEffect(() => {
    if (!signature) {
      setUpcoming([]);
      return;
    }
    let cancelled = false;
    fetch("/menus/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: signature.split("|") }),
    })
      .then((r) => (r.ok ? r.json() : { upcoming: [] }))
      .then((d: { upcoming: UpcomingFavorite[] }) => !cancelled && setUpcoming(d.upcoming))
      .catch(() => !cancelled && setUpcoming([]));
    return () => {
      cancelled = true;
    };
  }, [signature]);
  return upcoming;
}

/**
 * "Your favorites": saved dishes on the menu for the current selection, then
 * when the rest are served next this week.
 */
export function FavoritesSection({
  favorites,
  dishes,
  date,
  isToday,
  onSelectOffering,
}: {
  onSelectOffering?: (offering: Offering) => void;
  favorites: ReadonlyMap<string, string>;
  /** Dishes for the current date/meal/filters that are favorites. */
  dishes: Dish[];
  date: string;
  isToday: boolean;
}) {
  const shownKeys = useMemo(() => new Set(dishes.map((d) => d.key)), [dishes]);
  const allKeys = useMemo(() => [...favorites.keys()], [favorites]);
  const upcoming = useUpcoming(allKeys);

  const later = (upcoming ?? []).filter((u) => !shownKeys.has(u.key));
  const scheduledKeys = new Set((upcoming ?? []).map((u) => u.key));
  const notThisWeek = upcoming
    ? allKeys.filter((k) => !shownKeys.has(k) && !scheduledKeys.has(k)).map((k) => favorites.get(k)!)
    : [];

  return (
    <section className="mt-5" aria-labelledby="favorites-heading">
      <SectionHeader
        title={
          <span id="favorites-heading" className="inline-flex items-center gap-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" aria-hidden /> Your favorites
          </span>
        }
        description={
          dishes.length
            ? `${dishes.length} on the menu ${isToday ? "for this meal" : "that day"}`
            : `None on the menu ${isToday ? "for this meal" : "that day"}`
        }
      />

      {dishes.length > 0 && (
        <div className="space-y-3">
          {dishes.map((dish) => (
            <DishCard key={dish.key} dish={dish} date={date} isToday={isToday} onSelectOffering={onSelectOffering} />
          ))}
        </div>
      )}

      {later.length > 0 && (
        <>
          <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coming up this week
          </h3>
          <ItemGroup className="overflow-hidden rounded-xl border border-border bg-card">
            {later.map((u) => (
              <Item key={u.key} asChild size="sm" className="rounded-none border-0 border-b border-border/60 last:border-b-0">
                <Link href={`/menus?q=${encodeURIComponent(u.name)}&date=${u.date}`}>
                  <ItemMedia variant="icon">
                    <CalendarClock />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{u.name}</ItemTitle>
                    <ItemDescription>
                      {relativeDay(u.date)} · {u.meal === "All Day" ? "All day" : u.meal} ·{" "}
                      {u.halls.map((h) => h.name).join(", ")}
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>
            ))}
          </ItemGroup>
        </>
      )}

      {notThisWeek.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Not on any menu this week: {notThisWeek.slice(0, 6).join(", ")}
          {notThisWeek.length > 6 ? ` and ${notThisWeek.length - 6} more` : ""}
        </p>
      )}
    </section>
  );
}
