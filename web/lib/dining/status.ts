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

export function determineHallStatus(shifts: OperatingHour[], dateStr?: string): DiningStatus {
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

  let bestShift: OperatingHour | null = null;

  for (const s of shifts) {
    const [eh, em] = s.end_time.split(':').map(Number);
    const eDate = new Date(estNow); eDate.setHours(eh, em, 0);

    const [sh, sm] = s.start_time.split(':').map(Number);
    const sDate = new Date(estNow); sDate.setHours(sh, sm, 0);

    if (estNow < eDate) {
      if (!bestShift) {
        bestShift = s;
      } else {
        const sPriority = getPriority(s.event_name || '');
        const bestPriority = getPriority(bestShift.event_name || '');

        const [bh, bm] = bestShift.start_time.split(':').map(Number);
        const bDate = new Date(estNow); bDate.setHours(bh, bm, 0);

        const isSActive = estNow >= sDate;
        const isBestActive = estNow >= bDate;

        if (isSActive && !isBestActive) {
          bestShift = s;
          continue;
        }
        if (!isSActive && isBestActive) continue;

        if (isSActive && isBestActive) {
          if (sPriority < bestPriority) bestShift = s;
          continue;
        }

        if (!isSActive && !isBestActive) {
          if (sDate < bDate) bestShift = s;
          else if (sDate.getTime() === bDate.getTime() && sPriority < bestPriority) bestShift = s;
        }
      }
    }
  }

  const targetShift = bestShift || shifts[shifts.length - 1];

  let status: DiningStatus = {
    isOpen: false,
    text: "Closed",
    label: "Closed",
    closesAt: null,
    color: "red",
    details: "Check Schedule"
  };

  if (targetShift) {
    const [eh, em] = targetShift.end_time.split(':').map(Number);
    const eDate = new Date(estNow); eDate.setHours(eh, em, 0);

    const [sh, sm] = targetShift.start_time.split(':').map(Number);
    const sDate = new Date(estNow); sDate.setHours(sh, sm, 0);

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

      const nextShiftStartsImmediately = shifts.some(
        (s) => s !== targetShift && s.start_time === targetShift.end_time
      );
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
