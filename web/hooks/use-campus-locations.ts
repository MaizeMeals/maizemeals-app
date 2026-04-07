"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CampusLocation, DiningHallLocation, RetailLocation } from "@/types/location";
import { determineHallStatus } from "@/lib/dining-utils";
import { CapacityApiResponse } from "@/lib/api-types";

export function useCampusLocations() {
  const [data, setData] = useState<CampusLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // 1. Fetch All Locations
      const { data: rawLocations } = await supabase
        .from('dining_halls')
        .select('*')
        .order('name');

      if (!rawLocations) return;

      // 2. Fetch Hours for Today
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const { data: hoursData } = await supabase
        .from('operating_hours')
        .select('*')
        .eq('date', today);

      const hoursMap = new Map();
      hoursData?.forEach(h => {
        if (!hoursMap.has(h.dining_hall_id)) hoursMap.set(h.dining_hall_id, []);
        hoursMap.get(h.dining_hall_id).push(h);
      });

      // 3. Conditionally Fetch Capacity
      // FIX: Filter by the exact DB string "DINING HALLS"
      const diningHallIds = rawLocations
        .filter(l => l.type === 'DINING HALLS')
        .map(l => l.name);

      let capMap: Record<string, any> = {};

      if (diningHallIds.length > 0) {
        try {
          const capRes = await fetch('/api/dining/capacity');
          if (capRes.ok) {
            const json: CapacityApiResponse = await capRes.json();
            json.data.forEach(c => {
               capMap[c.name] = c.capacity_count;
            });
          }
        } catch (e) {
          console.error("Capacity fetch failed", e);
        }
      }

      // 4. Merge & Shape (avg_rating and review_count come from dining_halls, auto-updated by DB)
      const processed = rawLocations.map(loc => {
        const hours = hoursMap.get(loc.id) || [];
        const statusCalc = determineHallStatus(hours);

        const hasContact =
          loc.address != null ||
          loc.phone != null ||
          (loc as { website?: string | null }).website != null;
        const contact = hasContact
          ? {
              address: loc.address ?? undefined,
              phone: loc.phone ?? undefined,
              website: (loc as { website?: string | null }).website ?? undefined,
            }
          : undefined;

        const base = {
          id: loc.id,
          official_id: loc.official_id,
          name: loc.name,
          slug: loc.slug,
          image_url: loc.image_url,
          lat: loc.latitude,
          lng: loc.longitude,
          contact,
          status: {
            isOpen: statusCalc.isOpen,
            label: statusCalc.label || statusCalc.text,
            color: statusCalc.color,
            details: statusCalc.details
          },
          average_rating: loc.avg_rating,
          review_count: loc.review_count
        };

        // A. Handle Dining Halls
        if (loc.type === 'DINING HALLS' || loc.type === 'DINING_HALLS') {
           const capacity_count = capMap[loc.name];
           let capacity = { label: "Quiet", color: "green", percentage: 0 };

           if (!base.status.isOpen) {
              capacity = { label: "Closed", color: "gray", percentage: 0 };
           } else if (capacity_count && capacity_count > 0) {
              let label = capacity_count > 70 ? "Busy" : capacity_count > 40 ? "Moderate" : "Quiet";
              let color = capacity_count > 70 ? "red" : capacity_count > 40 ? "orange" : "green";
              capacity = { label, color, percentage: capacity_count };
           }

           return { ...base, type: 'DINING_HALLS', capacity } as DiningHallLocation;
        }

        // B. Handle Retail
        // FIX: Ensure we map "CAFES" correctly, otherwise fall back to "MARKETS"
        return {
          ...base,
          type: loc.type as 'CAFES' | 'MARKETS',
        } as RetailLocation;
      });

      setData(processed);
      setLoading(false);
    }

    load();
  }, []);

  return { locations: data, loading };
}
