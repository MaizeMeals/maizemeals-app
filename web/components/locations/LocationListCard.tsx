"use client";

import { LocationSummary } from "@/types/location-summary";
import { Clock, MapPin, ChevronRight, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  CAPACITY_BG_COLORS,
  CAPACITY_COLORS,
  STATUS_COLORS,
  getLocationLabel,
  getLocationIcon
} from "@/lib/dining";

interface Props {
  data: LocationSummary;
  selected?: boolean;
  /** Called with the venue id (parent or child) when the user picks this location from the list. */
  onSelectVenue: (venueId: string) => void;
}

export function LocationListCard({ data, selected, onSelectVenue }: Props) {
  const venues = [data, ...(data.children || [])];

  return (
    <div
      className={cn(
        "group flex flex-col w-full overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg",
        selected
          ? "border-primary ring-1 ring-muted-foreground bg-accent/5"
          : "border-border hover:border-muted-foreground/50"
      )}
    >
      {/* --- HEADER: Building Context — opens detail with primary (parent) venue --- */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectVenue(data.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectVenue(data.id);
          }
        }}
        className="flex cursor-pointer items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <h3 className="font-bold text-lg text-foreground tracking-tight">
          {data.name}
        </h3>

        {data.distance !== null && (
          <div className="flex items-center text-[11px] font-semibold text-muted-foreground bg-background px-2.5 py-1 rounded-full border shadow-sm">
            <MapPin className="mr-1 h-3 w-3 text-primary" />
            {data.distance.toFixed(1)} mi
          </div>
        )}
      </div>

      {/* --- BODY: Interactive Venue List --- */}
      <div className="divide-y divide-border/40">
        {venues.map((venue) => {
          const Icon = getLocationIcon(venue.type);
          const displayLabel = getLocationLabel(venue, data.name);
          const isDining = venue.type === 'DINING_HALLS';
          const rating =
            venue.average_rating != null && venue.average_rating > 0
              ? venue.average_rating.toFixed(1)
              : null;
          const reviewCount = venue.review_count ?? 0;

          return (
            <div
              key={venue.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectVenue(venue.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectVenue(venue.id);
                }
              }}
              className="relative flex cursor-pointer p-3 gap-3 hover:bg-muted/60 transition-colors group/item outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >

              {/* LEFT: Visual Anchor */}
              <div className="shrink-0 relative">
                {isDining && venue.image_url ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border/50 shadow-sm">
                    <Image
                      src={`/images/dining_halls/${venue.image_url}`}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover/item:scale-105"
                    />
                  </div>
                ) : (
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl border shadow-sm transition-colors",
                    venue.isOpen
                      ? "bg-card border-primary/35 text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                )}

                {/* Overlaid "Popular" Badge for busy places */}
                {isDining && venue.isOpen && venue.capacity && venue.capacity.percentage > 70 && (
                  <Badge
                    variant="danger"
                    shape="pill"
                    className="absolute -bottom-1 -right-1 gap-0.5 border-background px-1.5 py-0 text-[9px] font-bold shadow-md"
                  >
                    <TrendingUp className="h-2 w-2" />
                    BUSY
                  </Badge>
                )}
              </div>

              {/* CENTER: Information */}
              <div className="flex flex-col justify-center flex-1 min-w-0 py-0.5">

                {/* Row 1: Title + Status Badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-foreground truncate pr-2">
                    {displayLabel}
                  </span>

                  <Badge
                    variant={STATUS_COLORS[venue.statusColor]}
                    shape="pill"
                    className="px-2 py-0 text-[10px] font-bold uppercase tracking-wider"
                  >
                    {venue.statusLabel}
                  </Badge>
                </div>

                {/* Row 2: Details (Time or Rating) */}
                <div className="flex items-center text-xs text-muted-foreground mb-1.5 h-4">
                  {isDining ? (
                    // Dining: Show Time Context
                    <>
                      <Clock className="w-3 h-3 mr-1.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">
                        {venue.statusDetails || "Check schedule"}
                      </span>
                    </>
                  ) : (
                     // Retail: Show average rating and review count when available
                    <div className="flex items-center gap-3">
                      {rating ? (
                        <>
                          <Badge variant="maize-soft" shape="pill" className="gap-1 px-1.5 py-0 font-medium">
                            <Star className="h-3 w-3 fill-current" />
                            {rating}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "Avg. Rating"}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No ratings yet</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 2b: Hall Match Score for the current/next meal */}
                {isDining && venue.matchScore != null && (
                  <div className="mb-1.5 flex min-w-0 items-center gap-1.5 text-xs">
                    <MatchBadge score={venue.matchScore} />
                    <span className="truncate text-muted-foreground">
                      {venue.matchMeal ? `${venue.matchMeal}: ` : ""}
                      {(venue.matchReasons ?? []).slice(0, 2).join(" · ")}
                    </span>
                  </div>
                )}

                {/* Row 3: Actionable Data (Capacity) — only when open (live data meaningful) */}
                {isDining && venue.isOpen && venue.capacity && (
                  <div className="flex items-center text-xs">
                    <span className={cn(
                      "font-bold mr-2",
                      CAPACITY_COLORS[venue.capacity.color]
                    )}>
                      {venue.capacity.percentage}% Full
                    </span>
                    <div className="h-1.5 flex-1 max-w-[80px] bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", CAPACITY_BG_COLORS[venue.capacity.color])}
                        style={{ width: `${venue.capacity.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Action Arrow (desktop list sidebar) */}
              <div className="hidden md:flex items-center justify-center pl-1 text-muted-foreground/30 group-hover/item:text-primary transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>


            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchBadge({ score }: { score: number }) {
  const variant = score >= 80 ? "maize" : score >= 60 ? "maize-soft" : "muted";
  return (
    <Badge
      variant={variant}
      shape="pill"
      className="shrink-0 py-0 text-[11px] font-bold tabular-nums"
      title="How well this hall's menu matches your preferences"
    >
      {score}% match
    </Badge>
  );
}
