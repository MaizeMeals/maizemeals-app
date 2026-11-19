"use client";

import { Clock, Loader2, MapPin, Navigation, Phone, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, CAPACITY_COLORS, CAPACITY_BG_COLORS, formatTime } from "@/lib/dining";
import type { OperatingHour } from "@/types/dining";
import type { LocationSummary } from "@/types/location-summary";
import { directionsUrl, easternDateKey, isShiftNow } from "./location-utils";

type Props = {
  activeVenue: LocationSummary;
  loading: boolean;
  weeklyHours?: Record<string, OperatingHour[]>;
  /** Jump to the About tab's full weekly schedule. */
  onShowWeek?: () => void;
};

export function OverviewTab({ activeVenue, loading, weeklyHours, onShowWeek }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = easternDateKey();
  const todayHours = [...(weeklyHours?.[today] ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const capacity = activeVenue.capacity;
  // Only show capacity when M-Dining actually reported a number for this hall.
  const showCapacity = activeVenue.type === "DINING_HALLS" && activeVenue.isOpen && capacity && capacity.percentage > 0;

  return (
    <div className="space-y-5 p-5">
      {showCapacity ? (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden /> How busy
            </span>
            <span
              className={cn(
                "rounded-full border bg-background px-2 py-0.5 text-xs font-bold",
                CAPACITY_COLORS[capacity.color],
              )}
            >
              {capacity.label} · {capacity.percentage}% full
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-all duration-500", CAPACITY_BG_COLORS[capacity.color])}
              style={{ width: `${capacity.percentage}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* --- TODAY'S HOURS --- */}
      <div className="flex gap-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_COLORS[activeVenue.statusColor] ?? "muted"} shape="pill">
              {activeVenue.isOpen ? "Open" : "Closed"}
            </Badge>
            {activeVenue.statusDetails ? (
              <span className="truncate text-sm text-muted-foreground">{activeVenue.statusDetails}</span>
            ) : null}
          </div>
          {todayHours.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {todayHours.map((h) => {
                const now = isShiftNow(h, today);
                return (
                  <li
                    key={h.id}
                    className={cn(
                      "flex items-baseline justify-between gap-4",
                      now ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span>
                      {h.event_name || "Open"}
                      {now ? <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Now</span> : null}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatTime(h.start_time)} – {formatTime(h.end_time)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No hours posted for today.</p>
          )}
          {onShowWeek ? (
            <button type="button" onClick={onShowWeek} className="mt-2 text-xs font-semibold text-primary hover:underline">
              See this week&apos;s hours
            </button>
          ) : null}
        </div>
      </div>

      <hr className="border-border/40" />

      {/* --- ADDRESS --- */}
      <div className="flex items-start gap-4 text-sm">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-foreground">{activeVenue.contact?.address ?? activeVenue.name}</p>
          <a
            href={directionsUrl(activeVenue)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Navigation className="h-3 w-3" aria-hidden /> Get directions
          </a>
        </div>
      </div>

      {/* --- PHONE --- */}
      {activeVenue.contact?.phone ? (
        <div className="flex items-center gap-4 text-sm">
          <Phone className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <a href={`tel:${activeVenue.contact.phone}`} className="text-primary hover:underline">
            {activeVenue.contact.phone}
          </a>
        </div>
      ) : null}
    </div>
  );
}
