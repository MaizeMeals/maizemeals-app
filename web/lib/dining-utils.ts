import { OperatingHour, Item } from "@/types/dining"

export type DiningStatus = {
  isOpen: boolean
  text: string
  closesAt: string | null
  color: "green" | "red" | "orange"
  details: string
  label?: string // Compatibility with useDiningStatus
}

export const getMacroTags = (item: Item): string[] => {
  const tags: string[] = []
  
  if (!item.macronutrients || typeof item.macronutrients !== 'object') return tags;
  
  const macros = item.macronutrients as Record<string, number>;
  const protein = Number(macros["Protein"]) || 0;
  const fiber = Number(macros["Dietary Fiber"]) || 0;

  // Thresholds
  if (protein >= 12) tags.push("High Protein");
  if (fiber >= 4) tags.push("High Fiber");

  return tags;
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

  for (const s of shifts) {
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

             const isSActive = estNow >= sDate;

             const [bh, bm] = bestShift.start_time.split(':').map(Number);
             const bDate = new Date(estNow); bDate.setHours(bh, bm, 0);
             const isBestActive = estNow >= bDate;

             // STARTING SOON CHECK:
             const minsUntilBest = (bDate.getTime() - estNow.getTime()) / 60000;
             const isBestStartingSoon = !isBestActive && minsUntilBest > 0 && minsUntilBest < 45;

             // If the current best is a High Priority meal starting soon (e.g. Dinner in 5 mins),
             // DO NOT switch to a low priority active shift (e.g. Kiosk).
             if (isBestStartingSoon && bestPriority < sPriority) {
                 continue; // Keep the best shift (Dinner)
             }

             // If new shift is Active and current best is NOT active (and not starting soon)
             if (isSActive && !isBestActive && !isBestStartingSoon) {
                 bestShift = s;
             }
             // If both have same status (both active or both future), pick higher priority
             else if ((isSActive === isBestActive) && (sPriority < bestPriority)) {
                 bestShift = s;
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

      // 1. Before Shift Starts
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
