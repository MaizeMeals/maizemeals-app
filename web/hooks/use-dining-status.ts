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

      // 2. Fetch Hours & Capacity (Parallel)
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

      const [hoursRes, capRes] = await Promise.all([
        supabase.from('operating_hours').select('*').eq('date', today),
        fetch('/api/dining/capacity').then(r => r.json() as Promise<CapacityApiResponse>)
      ]);

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
        
        // Use shared logic for status
        const statusData = determineHallStatus(shifts);
        const status = {
            label: statusData.label || statusData.text,
            color: statusData.color,
            details: statusData.details
        };

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