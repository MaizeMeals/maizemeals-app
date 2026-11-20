"use client";

import { Flame } from "lucide-react";
import type { WeekDay } from "@/app/actions/macro-tracker";
import { cn } from "@/lib/utils";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/** Last 7 days of calories against the goal; tap a day to open it. */
export function WeekStrip({
  days,
  goal,
  proteinGoal,
  streak,
  selected,
  today,
  onSelect,
}: {
  days: WeekDay[];
  goal: number;
  proteinGoal: number;
  streak: number;
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const logged = days.filter((d) => d.entries > 0);
  const avgCal = logged.length ? logged.reduce((s, d) => s + d.calories, 0) / logged.length : 0;
  const avgProtein = logged.length ? logged.reduce((s, d) => s + d.protein, 0) / logged.length : 0;
  const onTarget = logged.filter((d) => d.calories <= goal * 1.05 && d.calories >= goal * 0.8).length;
  const top = Math.max(goal * 1.2, ...days.map((d) => d.calories));

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-labelledby="week-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="week-heading" className="font-bold">
          This week
        </h2>
        {streak > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
            <Flame className="h-4 w-4" aria-hidden /> {streak}-day streak
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {logged.length
          ? `Avg ${Math.round(avgCal).toLocaleString()} cal · ${Math.round(avgProtein)}g protein (goal ${Math.round(proteinGoal)}g) · ${onTarget} of ${logged.length} logged days near your calorie goal`
          : "Nothing logged in the last 7 days."}
      </p>
      <div className="relative mt-3">
        {/* Bars sit in an 80px track above a 16px day label. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/30"
          style={{ bottom: 20 + (goal / top) * 80 }}
          aria-hidden
        />
        <div className="grid grid-cols-7 items-end gap-2">
          {days.map((d) => {
            const h = top > 0 ? Math.max(d.entries ? 6 : 2, (d.calories / top) * 80) : 2;
            const over = d.calories > goal * 1.05;
            const dow = DOW[new Date(`${d.date}T12:00:00Z`).getUTCDay()];
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onSelect(d.date)}
                className="flex h-[100px] flex-col items-center justify-end gap-1"
                aria-label={`${d.date}: ${Math.round(d.calories)} calories`}
                aria-pressed={d.date === selected}
              >
                <span
                  className={cn(
                    "w-full max-w-8 rounded-md",
                    d.entries === 0 ? "bg-muted" : over ? "bg-orange-400" : "bg-maize",
                    d.date === selected && "ring-2 ring-foreground/60 ring-offset-1 ring-offset-card",
                  )}
                  style={{ height: h }}
                />
                <span
                  className={cn(
                    "h-4 text-[11px] leading-4",
                    d.date === today ? "font-bold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {dow}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
