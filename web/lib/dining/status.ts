// lib/dining/status.ts

import { OperatingHour } from "@/types/dining";
import { formatTime } from "./formatters";
import { getPriority, DiningStatusColor } from "./constants";

export type DiningStatus = {
  isOpen: boolean;
  text: string;
  label: string;
  closesAt: string | null;
  color: DiningStatusColor;
  details: string;
};

function clockParts(time: string): { hours: number; minutes: number; totalMinutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

/** Local wall-clock bounds of a shift on `day`. Does not mutate `day`.
 * Times are "HH:MM" or "HH:MM:SS". When end minutes <= start minutes,
 * including 00:00–00:00, `end` is on the next calendar day.
 * 00:00–00:00 is a 24-hour window starting at `day` 00:00.
 */
export function shiftBoundsOnDay(
  startTime: string,
  endTime: string,
  day: Date,
): { start: Date; end: Date } {
  const startParts = clockParts(startTime);
  const endParts = clockParts(endTime);

  const start = new Date(day);
  start.setHours(startParts.hours, startParts.minutes, 0);

  const end = new Date(day);
  end.setHours(endParts.hours, endParts.minutes, 0);

  if (endParts.totalMinutes <= startParts.totalMinutes) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

type AnchoredShift = { shift: OperatingHour; day: Date };

/**
 * Live status for `shifts` on `dateStr` (today when omitted).
 * Same-day windows whose end is at or before the start run past midnight
 * (22:00–02:00 is open at 23:00; 00:00–00:00 is open all day).
 * Callers must pass prior-day shifts to recognize a shift that started
 * yesterday and is still open after midnight. Those rows are anchored on
 * the previous calendar day. Closed only when the instant is before start
 * or strictly after end (the exact end timestamp is still open).
 */
export function determineHallStatus(
  shifts: OperatingHour[],
  dateStr?: string,
  priorDayShifts?: OperatingHour[],
): DiningStatus {
  const now = new Date();
  let estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  let isToday = true;
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
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

  const requestedDay = new Date(estNow);
  const priorDay = new Date(estNow);
  priorDay.setDate(priorDay.getDate() - 1);

  const anchored: AnchoredShift[] = [
    ...(priorDayShifts ?? []).map((shift) => ({ shift, day: priorDay })),
    ...shifts.map((shift) => ({ shift, day: requestedDay })),
  ];

  let best: AnchoredShift | null = null;

  for (const candidate of anchored) {
    const { start: sDate, end: eDate } = shiftBoundsOnDay(
      candidate.shift.start_time,
      candidate.shift.end_time,
      candidate.day,
    );

    // Exact end is still open; drop the shift only once instant > end.
    if (estNow <= eDate) {
      if (!best) {
        best = candidate;
      } else {
        const sPriority = getPriority(candidate.shift.event_name || '');
        const bestPriority = getPriority(best.shift.event_name || '');

        const bDate = shiftBoundsOnDay(
          best.shift.start_time,
          best.shift.end_time,
          best.day,
        ).start;

        const isSActive = estNow >= sDate;
        const isBestActive = estNow >= bDate;

        if (isSActive && !isBestActive) {
          best = candidate;
          continue;
        }
        if (!isSActive && isBestActive) continue;

        if (isSActive && isBestActive) {
          if (sPriority < bestPriority) best = candidate;
          continue;
        }

        if (!isSActive && !isBestActive) {
          if (sDate < bDate) best = candidate;
          else if (sDate.getTime() === bDate.getTime() && sPriority < bestPriority) best = candidate;
        }
      }
    }
  }

  const target = best ?? (shifts.length
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

    // 1. Before Shift
    if (estNow < sDate) {
      status = {
        isOpen: false,
        text: "Closed",
        label: "Closed",
        closesAt: null,
        color: "red",
        details: `Opens ${formatTime(targetShift.start_time)}`
      };
    }
    // 2. After Shift
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
    // 3. Active
    else {
      const minutesLeft = (eDate.getTime() - estNow.getTime()) / 60000;
      const closesAtText = formatTime(targetShift.end_time);

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

  if (!isToday) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: "America/New_York" });
    const isFuture = dateStr! > today;
    status.text = isFuture ? "Future" : "Past";
    status.color = "gray";
    status.isOpen = false;
  }

  return status;
}
