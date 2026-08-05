import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, ItemMetadata, LocationData, MenuData, MenuEvent, OperatingHour } from "@/types/dining";
import { determineHallStatus } from "@/lib/dining";

type RecommendedMenuEvent = MenuEvent & {
  items: (Item & {
    photos: Array<{ storage_path: string; is_approved: boolean | null }>;
  }) | null;
  recommendation_score?: number;
};

export function useLocationData(slug: string, dateStr?: string) {
  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

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
        if (!cancelled) {
          setError("Location not found");
          setLoading(false);
        }
        return;
      }

      const recommendationParams = new URLSearchParams({
        hall_id: hall.id,
        date: targetDate,
      });
      const recommendationsRequest = fetch(`/recommendations?${recommendationParams.toString()}`, {
        credentials: "same-origin",
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Recommendation route failed");
          const payload = (await response.json()) as { events?: RecommendedMenuEvent[] };
          return payload.events ?? [];
        })
        // Preserve menu availability during a partial deployment where the
        // route or its migration has not reached the server yet.
        .catch(async () => {
          const { data: fallbackEvents } = await supabase
            .from("menu_events")
            .select(`
              *,
              items (
                *,
                photos ( storage_path, is_approved )
              )
            `)
            .eq("dining_hall_id", hall.id)
            .eq("date", targetDate);
          return (fallbackEvents ?? []) as RecommendedMenuEvent[];
        });

      // 2. Fetch Hours (Target Date + Full Week Parallel)
      const [
        { data: targetHours },
        { data: weeklyHoursData },
        { data: availability },
        events,
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
        recommendationsRequest,
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
            reviewCount: item.review_count ?? 0,
          };

          // Strip relational metadata out to keep the pure Item type clean
          const { photos, ...pureItem } = item;
          
          stationGroup.items.push(pureItem as Item);
        });
      }

      Object.keys(menu).forEach((meal) => {
        menu[meal].sort((a, b) => a.station.localeCompare(b.station));
      });

      if (!cancelled) {
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
        setError(null);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, dateStr, reloadKey]);

  return { data, loading, error, refetch };
}
