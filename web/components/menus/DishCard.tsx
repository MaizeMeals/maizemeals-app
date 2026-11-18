"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DietaryTag } from "@/components/locations/slug/DietaryTags";
import type { Dish, Offering } from "@/lib/day-menu/dishes";
import { formatClock, itemTags } from "@/lib/day-menu/scoring";

const TAG_ORDER = ["vegan", "vegetarian", "halal", "kosher", "glutenfree", "spicy", "highprotein"];

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function StatusPill({ offering }: { offering: Offering }) {
  const s = offering.status;
  if (s.kind === "now") {
    return (
      <Badge variant="success" shape="pill" className="gap-1 py-0 text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
        Serving now
      </Badge>
    );
  }
  if (s.kind === "later") {
    return (
      <Badge variant="muted" shape="pill" className="py-0 text-[11px]">
        {s.minutesUntil <= 90 ? `In ${formatDuration(s.minutesUntil)}` : `At ${formatClock(s.startsAt)}`}
      </Badge>
    );
  }
  if (s.kind === "ended") {
    return <span className="text-[11px] font-medium text-muted-foreground/70">Ended</span>;
  }
  return null;
}

function OfferingRow({ offering, date, isToday }: { offering: Offering; date: string; isToday: boolean }) {
  const { item, hall, meal, window } = offering;
  const params = new URLSearchParams({ item: item.id });
  if (!isToday) params.set("date", date);
  const timeText = window ? `${formatClock(window.start)}–${formatClock(window.end)}` : null;

  return (
    <li>
      <Link
        href={`/locations/${hall.slug}?${params.toString()}`}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          offering.status.kind === "ended" && "opacity-60",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{hall.name}</span>
            <StatusPill offering={offering} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {meal === "All Day" ? "All day" : meal}
            {timeText && ` · ${timeText}`}
            {item.station && ` · ${item.station}`}
          </p>
        </div>
        {item.reviewCount > 0 && (
          <span
            className="flex shrink-0 items-center gap-0.5 text-xs font-semibold"
            title={`${item.avgRating.toFixed(1)} from ${item.reviewCount} review${item.reviewCount === 1 ? "" : "s"} at ${hall.name}`}
          >
            <Star className="h-3 w-3 fill-maize text-maize" aria-hidden />
            {item.avgRating.toFixed(1)}
            <span className="font-normal text-muted-foreground">({item.reviewCount})</span>
          </span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export function DishCard({
  dish,
  date,
  isToday,
  maxRows = 4,
}: {
  dish: Dish;
  date: string;
  isToday: boolean;
  maxRows?: number;
}) {
  const { primary } = dish;
  const tags = itemTags(primary)
    .filter((t, i, arr) => TAG_ORDER.includes(t) && arr.indexOf(t) === i)
    .sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b));
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? dish.offerings : dish.offerings.slice(0, maxRows);
  const hidden = dish.offerings.length - shown.length;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="px-4 pb-2 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="type-card-title">{dish.name}</h3>
          {dish.bestRating && (
            <Badge variant="maize-soft" className="shrink-0 gap-1 px-1.5 font-bold">
              <Star className="h-3 w-3 fill-maize text-maize" aria-hidden />
              {dish.bestRating.value.toFixed(1)}
            </Badge>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <DietaryTag key={t} tag={t} />
          ))}
          {primary.macros.calories > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(primary.macros.calories)} cal
              {primary.macros.protein > 0 && ` · ${Math.round(primary.macros.protein)}g protein`}
            </span>
          )}
        </div>
      </header>
      <ul className="divide-y divide-border/60 border-t border-border/60">
        {shown.map((o) => (
          <OfferingRow key={o.item.id} offering={o} date={date} isToday={isToday} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full border-t border-border/60 px-4 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          Show {hidden} more {hidden === 1 ? "place" : "places"}
        </button>
      )}
    </article>
  );
}
