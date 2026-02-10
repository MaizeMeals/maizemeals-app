// hooks/use-dining-status.ts
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DiningHall, OperatingHour } from "@/types/dining"
import { CapacityApiResponse } from '@/lib/api-types'

export type ProcessedHall = DiningHall & {
  status: { label: string; color: string; details: string };
  capacity: { label: string; color: string; percentage: number };
}

// Helper: Format 24h time to 12h AM/PM
const formatTime = (timeStr: string) => {
  if (!timeStr) return "--"
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

// Helper: Shift Priority (Lower = Higher Priority)
const getPriority = (eventName: string) => {
  const name = (eventName || '').toLowerCase();
  if (name.includes('dinner')) return 1;
  if (name.includes('lunch')) return 2;
  if (name.includes('breakfast')) return 3;
  if (name.includes('brunch')) return 3;
  if (name.includes('standard')) return 4;
  return 10; // Kiosks, Cafes, etc.
};

export function useDiningStatus() {
  const [data, setData] = useState<ProcessedHall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // 1. Fetch Halls
      const { data: halls } = await supabase
        .from('dining_halls')
        .select('*')
        .eq('type', 'DINING HALLS')
        .order('name')

      if (!halls) return

      // 2. Fetch Hours & Capacity (Parallel)
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

      const [hoursRes, capRes] = await Promise.all([
        supabase.from('operating_hours').select('*').eq('date', today),
        fetch('/api/dining/capacity').then(r => r.json() as Promise<CapacityApiResponse>)
      ]);

      console.log(capRes);

      const hallHours: Record<string, OperatingHour[]> = {}
      hoursRes.data?.forEach(h => {
        if (!hallHours[h.dining_hall_id]) hallHours[h.dining_hall_id] = []
        hallHours[h.dining_hall_id].push(h)
      });

      const capMap: Record<string, { current: number, total: number }> = {}
      if (capRes.data) {
        capRes.data.forEach(c => {
          capMap[c.name] = { current: c.current_capacity, total: c.total_capacity };
        });
      }

      // 3. Main Processing Loop
      const processed = halls.map(hall => {
        const shifts = hallHours[hall.id] || [];

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
                   // If 'bestShift' is NOT active, but starts in < 45 mins, treat it as "effectively active"
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

        // --- B. Determine Status Label/Color ---
        let status = { label: "Closed", color: "red", details: "Check Schedule" };

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
                    label: "Closed",
                    color: "red",
                    details: `Opens ${formatTime(targetShift.start_time)}`
                };
            }
            // 2. After Shift Ends
            else if (estNow > eDate) {
                status = {
                    label: "Closed",
                    color: "red",
                    details: "Closed for the day"
                };
            }
            // 3. Currently Open
            else {
                const minutesLeft = (eDate.getTime() - estNow.getTime()) / 60000;

                if (minutesLeft < 30) {
                    status = {
                        label: "Closing Soon",
                        color: "orange",
                        details: `${eventName} ending at ${formatTime(targetShift.end_time)}`
                    };
                } else {
                    status = {
                        label: "Open",
                        color: "green",
                        details: `${eventName} until ${formatTime(targetShift.end_time)}`
                    };
                }
            }
        }

        // --- C. Determine Capacity ---
        const capData = capMap[hall.name];
        let capacity = { label: "Quiet", color: "green", percentage: 0 };

        if (capData && capData.total > 0) {
            const pct = Math.round((capData.current / capData.total) * 100);
            let label = "Quiet";
            let color = "green";
            if (pct > 70) { label = "Very Busy"; color = "red"; }
            else if (pct > 40) { label = "Moderate"; color = "orange"; }
            capacity = { label, color, percentage: pct };
        } else if (!capData) {
            capacity = { label: "No Data", color: "slate", percentage: 0 };
        }

        return { ...hall, status, capacity }
      })

      setData(processed)
      setLoading(false)
    }
    load()
  }, [])

  return { halls: data, loading }
}
