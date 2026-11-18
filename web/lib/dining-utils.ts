import { OperatingHour, Item } from "@/types/dining"
import { getDynamicTags } from "./filter-utils"
import { CLIENT_PUBLIC_FILES_PATH } from "next/dist/shared/lib/constants"
import { shiftBoundsOnDay } from "@/lib/dining/status"

export type DiningStatus = {
  isOpen: boolean
  text: string
  closesAt: string | null
  color: "green" | "red" | "orange" | "gray"
  details: string
  label?: string // Compatibility with useDiningStatus
}

// Shared Color Mappings
export const STATUS_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800",
  red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
  orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800",
  gray: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800",
}

export const CAPACITY_COLORS: Record<string, string> = {
  green: "text-green-600 dark:text-green-400",
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-600 dark:text-orange-400",
  slate: "text-muted-foreground",
}

// Helper: Format 24h time to 12h AM/PM
export const formatTime = (timeStr: string) => {
  if (!timeStr) return "--"
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

// Helper: Shift Priority (Lower = Higher Priority)
export const getPriority = (eventName: string) => {
  const name = (eventName || '').toLowerCase();
  if (name.includes('dinner')) return 1;
  if (name.includes('lunch')) return 2;
  if (name.includes('breakfast')) return 3;
  if (name.includes('brunch')) return 3;
  if (name.includes('standard')) return 4;
  return 10; // Kiosks, Cafes, etc.
};

export const getTypeForDisplay = (type: string) => {
  switch (type.toLowerCase()) {
    case 'dining halls':
      return 'Dining Hall';
    case 'cafes':
      return 'Café';
    case 'markets':
      return 'Market';
    case 'grills':
      return 'Grill';
    default:
      return 'Unknown';
  }
}

export function cleanLocationName(name: string, type: string) {
  if (!name || !type) return name;
  if (type === "CAFES" || type === "MARKETS" || type === "GRILLS  ") return name;
  const singularType = type.replace(/s$/i, "");
  const regex = new RegExp(singularType, "gi");

  return name
    .replace(regex, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function determineHallStatus(
  shifts: OperatingHour[],
  dateStr?: string,
  priorDayShifts?: OperatingHour[],
): DiningStatus {
  const now = new Date();
  let estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  let isToday = true;
  if (dateStr) {
      // Parse YYYY-MM-DD
      const [y, m, d] = dateStr.split('-').map(Number);
      // Create date at 12:00 AM EST of that day
      // We construct it carefully to avoid timezone shifts
      const targetDate = new Date(estNow);
      targetDate.setFullYear(y);
      targetDate.setMonth(m - 1);
      targetDate.setDate(d);
      targetDate.setHours(0, 0, 0, 0);

      const todayStr = estNow.toLocaleDateString('en-CA');
      if (dateStr !== todayStr) {
          isToday = false;
          estNow = targetDate;
      }
  }

  // Callers must pass prior-day shifts to recognize a shift that started
  // yesterday and is still open after midnight. Those rows are anchored on
  // the previous calendar day. Same-day overnight windows use shiftBoundsOnDay.
  const requestedDay = new Date(estNow);
  const priorDay = new Date(estNow);
  priorDay.setDate(priorDay.getDate() - 1);
  const anchored = [
      ...(priorDayShifts ?? []).map((shift) => ({ shift, day: priorDay })),
      ...shifts.map((shift) => ({ shift, day: requestedDay })),
  ];

  let best: { shift: OperatingHour; day: Date } | null = null;
  // Helper to parse priority (assuming lower number = higher priority, e.g. Dinner=1, Breakfast=3)
  // Ensure this matches your actual getPriority logic
  const getPriority = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('dinner')) return 1;
      if (n.includes('lunch')) return 2;
      if (n.includes('breakfast')) return 3;
      return 4;
  };

  for (const candidate of anchored) {
      const s = candidate.shift;
      // Start/end on the shift's calendar day. Overnight ends roll to the next day.
      const { start: sDate, end: eDate } = shiftBoundsOnDay(s.start_time, s.end_time, candidate.day);

      // Exact end is still open; drop the shift only once instant > end.
      if (estNow <= eDate) {
          if (!best) {
              best = candidate;
          } else {
              // --- COMPARISON LOGIC ---
              const sPriority = getPriority(s.event_name || '');
              const bestPriority = getPriority(best.shift.event_name || '');

              const bDate = shiftBoundsOnDay(
                  best.shift.start_time,
                  best.shift.end_time,
                  best.day,
              ).start;

              const isSActive = estNow >= sDate;
              const isBestActive = estNow >= bDate;

              // 1. Prefer ACTIVE over FUTURE
              if (isSActive && !isBestActive) {
                  best = candidate;
                  continue;
              }
              if (!isSActive && isBestActive) {
                  continue; // Keep current best
              }

              // 2. If BOTH are ACTIVE: Use Priority (e.g. choose Dinner over Kiosk)
              if (isSActive && isBestActive) {
                  if (sPriority < bestPriority) {
                      best = candidate;
                  }
                  continue;
              }

              // 3. If BOTH are FUTURE: Use Time Proximity (This was missing!)
              // If it's 2 AM, pick Breakfast (7 AM) over Dinner (4 PM)
              if (!isSActive && !isBestActive) {
                  if (sDate < bDate) {
                       best = candidate;
                  }
                  // If times are same (rare), use priority as tiebreaker
                  else if (sDate.getTime() === bDate.getTime() && sPriority < bestPriority) {
                       best = candidate;
                  }
              }
          }
      }
  }

  // Fallback: If no shifts found (e.g. late night after all shifts ended), use the last one (usually Dinner)
  // to show "Closed" status correctly, OR handle as "Tomorrow" logic if needed.
  // For now, defaulting to the last shift is standard for "Closed" state.
  const target = best || (shifts.length
      ? { shift: shifts[shifts.length - 1], day: requestedDay }
      : null);

  let status: DiningStatus = {
      isOpen: false,
      text: "Closed",
      label: "Closed",
      closesAt: null,
      color: "red",
      details: "Check Schedule"
  };

  if (target) {
      const targetShift = target.shift;
      const { start: sDate, end: eDate } = shiftBoundsOnDay(
          targetShift.start_time,
          targetShift.end_time,
          target.day,
      );

      let eventName = targetShift.event_name || 'Dining';
      if (eventName.includes('24/7') || eventName.includes('Kiosk')) eventName = 'Market';

      // 1. Before Shift Starts
      if (estNow < sDate) {
          status = {
              isOpen: false,
              text: "Closed",
              label: "Closed",
              closesAt: null,
              color: "red", // Or "gray" depending on preference
              details: `Opens ${formatTime(targetShift.start_time)}`
          };
      }
      // 2. After Shift Ends
      else if (estNow > eDate) {
          status = {
              isOpen: false,
              text: "Closed",
              label: "Closed",
              closesAt: null,
              color: "red",
              details: "Closed for the day"
          };
      }
      // 3. Currently Open
      else {
          const minutesLeft = (eDate.getTime() - estNow.getTime()) / 60000;
          const closesAtText = formatTime(targetShift.end_time);

          // Don't show "Closing Soon" if the next shift starts when this one ends (e.g. Breakfast → Brunch)
          const nextShiftStartsImmediately = anchored.some((other) => {
              if (other.shift === targetShift) return false;
              const otherStart = shiftBoundsOnDay(
                  other.shift.start_time,
                  other.shift.end_time,
                  other.day,
              ).start;
              return otherStart.getTime() === eDate.getTime();
          });
          const showClosingSoon = minutesLeft < 30 && !nextShiftStartsImmediately;

          if (showClosingSoon) {
              status = {
                  isOpen: true,
                  text: "Closing Soon",
                  label: "Closing Soon",
                  closesAt: closesAtText,
                  color: "orange",
                  details: `${eventName} ending at ${closesAtText}`
              };
          } else {
              status = {
                  isOpen: true,
                  text: "Open",
                  label: "Open",
                  closesAt: closesAtText,
                  color: "green",
                  details: `${eventName} until ${closesAtText}`
              };
          }
      }
  }

  // OVERRIDE FOR NON-TODAY DATES
  if (!isToday) {
      // Determine if it's past or future
      const today = new Date().toLocaleDateString('en-CA', { timeZone: "America/New_York" });
      const isFuture = dateStr! > today;

      status.text = isFuture ? "Future" : "Past";
      status.color = "gray"; // Neutral color for non-today
      status.isOpen = false; // Technically not "open now"
  }

  return status;
}
