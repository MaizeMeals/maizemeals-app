"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { catalogQuery } from "@/lib/catalog-query";
import type { Item, ItemMetadata, LocationData, MenuData, MenuEvent, OperatingHour } from "@/types/dining";
import { determineHallStatus } from "@/lib/dining";

function previousCalendarDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${month}-${day}`;
}

type RecommendedMenuEvent = MenuEvent & {
  items: (Item & {
    photos: Array<{ storage_path: string; is_approved: boolean | null }>;
  }) | null;
  recommendation_score?: number;
};

function easternCalendar() {
  const estNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const todayDate = new Date(estNow);
  const shift = (days: number) => {
    const next = new Date(todayDate);
    next.setDate(todayDate.getDate() + days);
    return next.toLocaleDateString("en-CA");
  };
  return {
    todayStr: todayDate.toLocaleDateString("en-CA"),
    startStr: shift(-7),
    endStr: shift(14),
    weekEndStr: shift(6),
  };
}

async function fetchLocationData(slug: string, dateStr?: string): Promise<LocationData> {
  const supabase = createClient();
  const { todayStr, startStr, endStr, weekEndStr } = easternCalendar();
  const targetDate = dateStr || todayStr;
  const viewingToday = targetDate === todayStr;

  const { data: hall, error: hallError } = await supabase
    .from("dining_halls")
    .select("*")
    .eq("slug", slug)
    .single();

  if (hallError || !hall) throw new Error("Location not found");

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

  const priorHoursRequest = viewingToday
    ? supabase
        .from("operating_hours")
        .select("*")
        .eq("dining_hall_id", hall.id)
        .eq("date", previousCalendarDay(targetDate))
        .order("start_time")
    : Promise.resolve({ data: [] as OperatingHour[] });

  const [
    { data: targetHours },
    { data: priorDayHours },
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
    priorHoursRequest,
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

  const availableDates = Array.from(new Set(availability?.map((row) => row.date) || []));
  const weeklyHours: Record<string, OperatingHour[]> = {};
  weeklyHoursData?.forEach((row) => {
    if (!weeklyHours[row.date]) weeklyHours[row.date] = [];
    weeklyHours[row.date].push(row);
  });

  const status = determineHallStatus(
    targetHours || [],
    targetDate,
    viewingToday ? priorDayHours || [] : undefined,
  );

  const menu: MenuData = {};
  const itemMetadata: Record<string, ItemMetadata> = {};

  events.forEach((event) => {
    const item = event.items;
    if (!item) return;
    if (!menu[event.meal]) menu[event.meal] = [];

    let stationGroup = menu[event.meal].find((group) => group.station === item.station);
    if (!stationGroup) {
      stationGroup = { station: item.station || "General", items: [] };
      menu[event.meal].push(stationGroup);
    }

    const approvedPhotos = Array.isArray(item.photos)
      ? item.photos.filter((photo) => photo.is_approved).map((photo) => photo.storage_path)
      : [];

    itemMetadata[item.id] = {
      photos: approvedPhotos,
      avgRating: item.avg_rating || 0,
      reviewCount: item.review_count ?? 0,
    };

    const { photos, ...pureItem } = item;
    void photos;
    stationGroup.items.push(pureItem as Item);
  });

  Object.keys(menu).forEach((meal) => {
    menu[meal].sort((a, b) => a.station.localeCompare(b.station));
  });

  return {
    hall,
    status,
    menu,
    itemMetadata,
    hours: targetHours || [],
    weeklyHours,
    availableDates,
    rating: hall.avg_rating ?? 0,
    reviewCount: hall.review_count ?? 0,
  };
}

export function useLocationData(slug: string, dateStr?: string) {
  const query = useQuery({
    queryKey: ["location-menu", slug, dateStr ?? "today"],
    queryFn: () => fetchLocationData(slug, dateStr),
    ...catalogQuery,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
