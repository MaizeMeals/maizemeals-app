"use client";

import { format } from "date-fns";
import { Globe, Loader2, Mail, MapPin, Navigation, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/dining";
import type { DiningHall, OperatingHour } from "@/types/dining";
import type { LocationSummary } from "@/types/location-summary";
import { directionsUrl, easternDateKey, isShiftNow } from "./location-utils";

const KIND_BLURB: Record<LocationSummary["type"], string> = {
  DINING_HALLS:
    "All-you-care-to-eat dining hall. Swipe in with a meal plan, Dining Dollars, or pay at the door.",
  CAFES: "Grab-and-go café. Pay with Blue Bucks, Dining Dollars, or card.",
  MARKETS: "Campus market with snacks, groceries, and grab-and-go meals. Pay with Blue Bucks, Dining Dollars, or card.",
};

type Props = {
  activeVenue: LocationSummary;
  hall?: DiningHall | null;
  weeklyHours?: Record<string, OperatingHour[]>;
  loading: boolean;
};

/** Weekly schedule + every way to reach the location. */
export function AboutTab({ activeVenue, hall, weeklyHours, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = easternDateKey();
  const days = Object.entries(weeklyHours ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 7);
  const address = hall?.address ?? activeVenue.contact?.address ?? null;
  const phone = hall?.phone ?? activeVenue.contact?.phone ?? null;
  const email = hall?.email ?? null;
  const website = activeVenue.contact?.website ?? null;

  return (
    <div className="space-y-6 p-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{KIND_BLURB[activeVenue.type]}</p>

      <section aria-labelledby="about-hours">
        <h3 id="about-hours" className="mb-3 text-sm font-semibold text-foreground">
          This week
        </h3>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hours haven&apos;t been posted yet.</p>
        ) : (
          <dl className="divide-y divide-border/60 rounded-xl border border-border/60">
            {days.map(([dateKey, hours]) => {
              const isToday = dateKey === today;
              const sorted = [...hours].sort((a, b) => a.start_time.localeCompare(b.start_time));
              return (
                <div key={dateKey} className={cn("flex gap-4 px-3 py-2.5 text-sm", isToday && "bg-maize/10")}>
                  <dt className={cn("w-24 shrink-0", isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {isToday ? "Today" : format(new Date(`${dateKey}T12:00:00`), "EEEE")}
                  </dt>
                  <dd className="min-w-0 flex-1 space-y-0.5">
                    {sorted.length === 0 ? (
                      <span className="text-muted-foreground">Closed</span>
                    ) : (
                      sorted.map((h) => (
                        <div
                          key={h.id}
                          className={cn(
                            "flex justify-between gap-3",
                            isShiftNow(h, dateKey) ? "font-semibold text-foreground" : "text-foreground/80",
                          )}
                        >
                          {sorted.length > 1 || (h.event_name && h.event_name !== "All Day") ? (
                            <span className="truncate">{h.event_name || "Open"}</span>
                          ) : (
                            <span />
                          )}
                          <span className="shrink-0 tabular-nums">
                            {formatTime(h.start_time)} – {formatTime(h.end_time)}
                          </span>
                        </div>
                      ))
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>

      <section aria-labelledby="about-contact" className="space-y-3 text-sm">
        <h3 id="about-contact" className="text-sm font-semibold text-foreground">
          Contact
        </h3>
        {address ? (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p>{address}</p>
              <a
                href={directionsUrl(activeVenue)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Navigation className="h-3 w-3" aria-hidden /> Get directions
              </a>
            </div>
          </div>
        ) : null}
        {phone ? (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <a href={`tel:${phone}`} className="text-primary hover:underline">
              {phone}
            </a>
          </div>
        ) : null}
        {email ? (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <a href={`mailto:${email}`} className="truncate text-primary hover:underline">
              {email}
            </a>
          </div>
        ) : null}
        {website ? (
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-primary hover:underline"
            >
              {website.replace(/^https?:\/\//i, "")}
            </a>
          </div>
        ) : null}
      </section>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Hours and contact details come from M-Dining and can change for breaks and events.
      </p>
    </div>
  );
}
