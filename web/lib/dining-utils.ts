import { OperatingHour, Item } from "@/types/dining"
import { getDynamicTags } from "./filter-utils"

export type DiningStatus = {
  isOpen: boolean
  text: string
  closesAt: string | null
  color: "green" | "red" | "orange"
  details: string
  label?: string // Compatibility with useDiningStatus
}

// Shared Color Mappings
export const STATUS_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 border-green-200 dark:border-green-800",
  red: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border-red-200 dark:border-red-800",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  gray: "bg-muted text-muted-foreground border-border",
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

export function determineHallStatus(shifts: OperatingHour[]): DiningStatus {
  const now = new Date();
  const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  let bestShift: OperatingHour | null = null;
  // Helper to parse priority (assuming lower number = higher priority, e.g. Dinner=1, Breakfast=3)
  // Ensure this matches your actual getPriority logic
  const getPriority = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('dinner')) return 1;
      if (n.includes('lunch')) return 2;
      if (n.includes('breakfast')) return 3;
      return 4;
  };

  for (const s of shifts) {
      // Create date objects for Start (sDate) and End (eDate) of the current shift 's'
      const [eh, em] = s.end_time.split(':').map(Number);
      const eDate = new Date(estNow); eDate.setHours(eh, em, 0);

      const [sh, sm] = s.start_time.split(':').map(Number);
      const sDate = new Date(estNow); sDate.setHours(sh, sm, 0);

      // Filter out shifts that have already ended
      if (estNow < eDate) {
          if (!bestShift) {
              bestShift = s;
          } else {
              // --- COMPARISON LOGIC ---
              const sPriority = getPriority(s.event_name || '');
              const bestPriority = getPriority(bestShift.event_name || '');

              // Date objects for 'bestShift' (bDate)
              const [bh, bm] = bestShift.start_time.split(':').map(Number);
              const bDate = new Date(estNow); bDate.setHours(bh, bm, 0);

              const isSActive = estNow >= sDate;
              const isBestActive = estNow >= bDate;

              // 1. Prefer ACTIVE over FUTURE
              if (isSActive && !isBestActive) {
                  bestShift = s;
                  continue;
              }
              if (!isSActive && isBestActive) {
                  continue; // Keep current best
              }

              // 2. If BOTH are ACTIVE: Use Priority (e.g. choose Dinner over Kiosk)
              if (isSActive && isBestActive) {
                  if (sPriority < bestPriority) {
                      bestShift = s;
                  }
                  continue;
              }

              // 3. If BOTH are FUTURE: Use Time Proximity (This was missing!)
              // If it's 2 AM, pick Breakfast (7 AM) over Dinner (4 PM)
              if (!isSActive && !isBestActive) {
                  if (sDate < bDate) {
                       bestShift = s;
                  }
                  // If times are same (rare), use priority as tiebreaker
                  else if (sDate.getTime() === bDate.getTime() && sPriority < bestPriority) {
                       bestShift = s;
                  }
              }
          }
      }
  }

  // Fallback: If no shifts found (e.g. late night after all shifts ended), use the last one (usually Dinner)
  // to show "Closed" status correctly, OR handle as "Tomorrow" logic if needed.
  // For now, defaulting to the last shift is standard for "Closed" state.
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

          if (minutesLeft < 30) {
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

  return status;
}
