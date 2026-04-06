"use client";

import { useState } from "react";
import { MapPin, Clock, Phone, Loader2, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { STATUS_COLORS, CAPACITY_COLORS, CAPACITY_BG_COLORS, formatTime } from "@/lib/dining";
import type { OperatingHour } from "@/types/dining";
import type { LocationSummary } from "@/types/location-summary";

type Props = {
  activeVenue: LocationSummary;
  loading: boolean;
  weeklyHours?: Record<string, OperatingHour[]>;
};

function getCurrentEvent(
  weeklyHours: Record<string, OperatingHour[]>
): { label: string; timeString: string } | null {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const hours = weeklyHours[todayStr];
  if (!hours?.length) return null;
  const now = new Date();
  for (const h of hours) {
    const start = new Date(todayStr + "T" + h.start_time);
    const end = new Date(todayStr + "T" + h.end_time);
    if (now >= start && now <= end) {
      const label = h.event_name || "Open";
      const timeString = `${formatTime(h.start_time)} – ${formatTime(h.end_time)}`;
      return { label, timeString };
    }
  }
  return null;
}

export function OverviewTab({ activeVenue, loading, weeklyHours }: Props) {
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  const hasSchedule = weeklyHours && Object.keys(weeklyHours).length > 0;
  const currentEvent = hasSchedule && weeklyHours ? getCurrentEvent(weeklyHours) : null;

  return (
    <div className="p-5 space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
        {/* --- CAPACITY (Dining Halls Only) --- */}
        {activeVenue.type === 'DINING_HALLS' && activeVenue.isOpen && activeVenue.capacity && (
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">Live Capacity</span>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full bg-background border", CAPACITY_COLORS[activeVenue.capacity.color])}>
                  {activeVenue.capacity.percentage}% Full
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-500", CAPACITY_BG_COLORS[activeVenue.capacity.color])}
                  style={{ width: `${activeVenue.capacity.percentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* --- HOURS & STATUS --- */}
          <div className="flex gap-4">
            <div className="mt-0.5 shrink-0"><Clock className="w-5 h-5 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0">
              {/* Collapsed: Open/Closed + current event; click to expand */}
              <button
                type="button"
                onClick={() => setScheduleExpanded((e) => !e)}
                className={cn(
                  "w-full text-left font-medium text-sm flex items-center justify-between gap-2 rounded-md hover:bg-muted/50 transition-colors -mx-1 px-1 py-0.5",
                  STATUS_COLORS[activeVenue.statusColor]?.split(" ")[1]
                )}
              >
                <span>
                  {activeVenue.isOpen ? "Open" : "Closed"}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground font-normal">
                  {scheduleExpanded ? (
                    <>
                      <span className="text-xs">Hide schedule</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : currentEvent ? (
                    <>
                      <span className="text-muted-foreground">
                        {currentEvent.label} {currentEvent.timeString}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {scheduleExpanded && activeVenue.statusDetails && (
                <p className="text-muted-foreground font-normal text-xs mt-1">
                  {activeVenue.statusDetails}
                </p>
              )}

              {/* Expanded: full weekly schedule; border moved left */}
              {scheduleExpanded && (
                <div className="text-sm text-muted-foreground -ml-7 mt-2 pl-3 border-l-2 border-border space-y-2">
                  {hasSchedule ? (
                    Object.entries(weeklyHours!).slice(0, 7).map(([dateStr, hours]) => {
                      const dateObj = new Date(dateStr + "T12:00:00Z");
                      const todayStr = new Date().toLocaleDateString("en-CA");
                      const isToday = dateStr === todayStr;
                      const now = new Date();

                      const isEventCurrent = (h: OperatingHour) => {
                        if (!isToday) return false;
                        const start = new Date(dateStr + "T" + h.start_time);
                        const end = new Date(dateStr + "T" + h.end_time);
                        return now >= start && now <= end;
                      };

                      return (
                        <div key={dateStr} className="space-y-1">
                          {hours.length === 0 ? (
                            <>
                              <div
                                className={cn(
                                  "text-foreground",
                                  isToday ? "font-semibold" : "opacity-90"
                                )}
                              >
                                {isToday ? "Today" : format(dateObj, "EEEE")}
                              </div>
                              <div className="pl-3 opacity-70">Closed</div>
                            </>
                          ) : hours.length === 1 ? (
                            <div
                              className={cn(
                                "flex justify-between items-baseline gap-4 text-foreground",
                                isToday ? "font-semibold" : "opacity-90",
                                isEventCurrent(hours[0]) && "font-bold"
                              )}
                            >
                              <span>{isToday ? "Today" : format(dateObj, "EEEE")}</span>
                              <span className="shrink-0">
                                {formatTime(hours[0].start_time)} – {formatTime(hours[0].end_time)}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div
                                className={cn(
                                  "text-foreground",
                                  isToday ? "font-semibold" : "opacity-90"
                                )}
                              >
                                {isToday ? "Today" : format(dateObj, "EEEE")}
                              </div>
                              <div className="pl-3 space-y-0.5">
                                {hours.map((h) => {
                                  const label = h.event_name || "Open";
                                  const timeString = `${formatTime(h.start_time)} – ${formatTime(h.end_time)}`;
                                  const current = isEventCurrent(h);
                                  return (
                                    <div
                                      key={h.id}
                                      className={cn(
                                        "flex justify-between items-baseline gap-4",
                                        current && "font-bold text-foreground"
                                      )}
                                    >
                                      <span>{label}</span>
                                      <span className="shrink-0">{timeString}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="opacity-70">Schedule unavailable</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="border-border/40" />

          {/* --- ADDRESS --- */}
          <div className="flex gap-4 items-center text-sm">
            <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-foreground">{activeVenue.contact?.address ?? activeVenue.name}</span>
          </div>

          {/* --- PHONE --- */}
          {activeVenue.contact?.phone != null && activeVenue.contact.phone !== "" && (
            <div className="flex gap-4 items-center text-sm">
              <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
              <a href={`tel:${activeVenue.contact.phone}`} className="text-primary hover:underline cursor-pointer">
                {activeVenue.contact.phone}
              </a>
            </div>
          )}

          {/* --- WEBSITE --- */}
          {activeVenue.contact?.website != null && activeVenue.contact.website !== "" && (
            <div className="flex gap-4 items-center text-sm">
              <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
              <a
                href={
                  activeVenue.contact.website.startsWith("http")
                    ? activeVenue.contact.website
                    : `https://${activeVenue.contact.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline cursor-pointer"
              >
                {activeVenue.contact.website.replace(/^https?:\/\//i, "")}
              </a>
            </div>
          )}

          
        </>
      )}
    </div>
  );
}
