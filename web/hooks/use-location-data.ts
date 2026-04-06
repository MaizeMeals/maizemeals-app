import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, ItemMetadata, LocationData, MenuData, OperatingHour } from "@/types/dining";
import { determineHallStatus } from "@/lib/dining";

export function useLocationData(slug: string, dateStr?: string) {
  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      // Setup Dates
      const estNow = new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
      });
      const todayDate = new Date(estNow);
      const targetDate = dateStr || todayDate.toLocaleDateString("en-CA");

      const startRange = new Date(todayDate);
      startRange.setDate(todayDate.getDate() - 7);
      const endRange = new Date(todayDate);
      endRange.setDate(todayDate.getDate() + 14);

      const weekEndRange = new Date(todayDate);
      weekEndRange.setDate(todayDate.getDate() + 6); // Next 7 days

      const startStr = startRange.toLocaleDateString("en-CA");
      const endStr = endRange.toLocaleDateString("en-CA");
      const todayStr = todayDate.toLocaleDateString("en-CA");
      const weekEndStr = weekEndRange.toLocaleDateString("en-CA");

      // 1. Fetch Hall Details
      const { data: hall, error: hallError } = await supabase
        .from("dining_halls")
        .select("*")
        .eq("slug", slug)
        .single();

      if (hallError || !hall) {
        setError("Location not found");
        setLoading(false);
        return;
      }

      // 2. Fetch Hours (Target Date + Full Week Parallel)
      const [
        { data: targetHours },
        { data: weeklyHoursData },
        { data: availability },
        { data: events } // <--- Moved menu fetch here
      ] = await Promise.all([
        supabase
          .from("operating_hours")
          .select("*")
          .eq("dining_hall_id", hall.id)
          .eq("date", targetDate)
          .order("start_time"),
        supabase
          .from("operating_hours")
          .select("*")
          .eq("dining_hall_id", hall.id)
          .gte("date", todayStr)
          .lte("date", weekEndStr)
          .order("date")
          .order("start_time"),
        supabase
          .from("operating_hours")
          .select("date")
          .eq("dining_hall_id", hall.id)
          .gte("date", startStr)
          .lte("date", endStr),
        supabase
          .from("menu_events")
          .select(`
            *,
            items (
              *,
              photos ( storage_path, is_approved )
            )
          `)
          .eq("dining_hall_id", hall.id)
          .eq("date", targetDate)
      ]);
      const availableDates = Array.from(
        new Set(availability?.map((a) => a.date) || []),
      );

      // Group weekly hours by date for easy UI rendering
      const weeklyHours: Record<string, OperatingHour[]> = {};
      weeklyHoursData?.forEach((h) => {
        if (!weeklyHours[h.date]) weeklyHours[h.date] = [];
        weeklyHours[h.date].push(h);
      });

      // 3. Rating/review count from dining_halls (auto-updated by DB)
      const rating = hall.avg_rating ?? 0;
      const reviewCount = hall.review_count ?? 0;

      // --- Process Status ---
      const status = determineHallStatus(targetHours || [], targetDate);

      // --- Process Menu & Metadata ---
      const menu: MenuData = {};
      const itemMetadata: Record<string, ItemMetadata> = {};

      if (events) {
        events.forEach((event) => {
          const meal = event.meal;
          
          // Because menu_events has item_id as a foreign key to items, 
          // Supabase returns 'items' as a single object (or null).
          const item = event.items;
          
          if (!item) return;

          if (!menu[meal]) menu[meal] = [];

          let stationGroup = menu[meal].find((g) => g.station === item.station);
          
          if (!stationGroup) {
            stationGroup = { station: item.station || "General", items: [] };
            menu[meal].push(stationGroup);
          }

          // Types are inferred: item.photos is an array of photo objects
          const approvedPhotos = Array.isArray(item.photos)
            ? item.photos
                .filter((p) => p.is_approved)
                .map((p) => p.storage_path)
            : [];

          itemMetadata[item.id] = {
            photos: approvedPhotos,
            avgRating: item.avg_rating || 0,
            // Fallback gracefully if you haven't run 'supabase gen types' for review_count yet
            reviewCount: 'review_count' in item ? Number((item as Record<string, unknown>).review_count) : 0, 
          };

          // Strip relational metadata out to keep the pure Item type clean
          const { photos, ...pureItem } = item;
          
          stationGroup.items.push(pureItem as Item);
        });
      }

      Object.keys(menu).forEach((meal) => {
        menu[meal].sort((a, b) => a.station.localeCompare(b.station));
      });

      setData({
        hall,
        status,
        menu,
        itemMetadata,
        hours: targetHours || [],
        weeklyHours,
        availableDates,
        rating,
        reviewCount,
      });
      setLoading(false);
    }

    load();
  }, [slug, dateStr]);

  return { data, loading, error };
}