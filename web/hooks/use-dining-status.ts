// hooks/use-dining-status.ts
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DiningHall, OperatingHour } from "@/types/dining"
import { CapacityApiResponse } from '@/lib/api-types'
import { determineHallStatus } from "@/lib/dining-utils"

export type ProcessedHall = DiningHall & {
  status: { label: string; color: string; details: string };
  capacity: { label: string; color: string; percentage: number };
}

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

      // 2. Fetch Hours First
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const { data: hoursData } = await supabase
        .from('operating_hours')
        .select('*')
        .eq('date', today);

      // Group Hours by Hall
      const hallHours: Record<string, OperatingHour[]> = {}
      if (hoursData) {
        hoursData.forEach(h => {
          if (!hallHours[h.dining_hall_id]) hallHours[h.dining_hall_id] = []
          hallHours[h.dining_hall_id].push(h)
        });
      }

      // 3. Determine Status & Check if ANY are open
      let anyOpen = false;
      const hallStatuses = halls.map(hall => {
          const shifts = hallHours[hall.id] || [];
          const status = determineHallStatus(shifts);
          if (status.isOpen) anyOpen = true;
          return { id: hall.id, status };
      });

      // 4. Conditionally Fetch Capacity
      let capMap: Record<string, { current: number, total: number }> = {};
      
      if (anyOpen) {
          try {
            const capRes = await fetch('/api/dining/capacity');
            if (capRes.ok) {
                const capData: CapacityApiResponse = await capRes.json();
                capData.data.forEach(c => {
                    capMap[c.name] = { current: c.current_capacity, total: c.total_capacity };
                });
            }
          } catch (e) {
              console.error("Failed to fetch capacity", e);
          }
      }

      // 5. Merge & Process
      const processed = halls.map(hall => {
        const preCalc = hallStatuses.find(h => h.id === hall.id)?.status || determineHallStatus([]); // Fallback
        
        const status = {
            label: preCalc.label || preCalc.text,
            color: preCalc.color,
            details: preCalc.details
        };

        // --- C. Determine Capacity ---
        const capData = capMap[hall.name];
        let capacity = { label: "Quiet", color: "green", percentage: 0 };

        if (!preCalc.isOpen) {
             capacity = { label: "Closed", color: "slate", percentage: 0 };
        } else if (capData && capData.total > 0) {
            const pct = Math.round((capData.current / capData.total) * 100);
            let label = "Quiet";
            let color = "green";
            if (pct > 70) { label = "Very Busy"; color = "red"; }
            else if (pct > 40) { label = "Moderate"; color = "orange"; }
            capacity = { label, color, percentage: pct };
        } else if (!capData) {
            // Open but no data
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