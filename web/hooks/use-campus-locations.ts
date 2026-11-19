"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { CAPACITY_STALE_TIME, catalogQuery } from "@/lib/catalog-query";
import { CampusLocation, DiningHallLocation, RetailLocation } from "@/types/location";
import { determineHallStatus } from "@/lib/dining";
import { CapacityApiResponse } from "@/lib/api-types";
import type { OperatingHour } from "@/types/dining";

type HallRow = {
  id: string;
  official_id: number | null;
  name: string;
  slug: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  phone: string | null;
  website?: string | null;
  type: string | null;
  avg_rating: number | null;
  review_count: number | null;
};

type CampusCatalog = {
  halls: HallRow[];
  today: string;
  yesterday: string;
  hours: OperatingHour[];
};

function campusDates() {
  const nyNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const today = nyNow.toLocaleDateString("en-CA");
  const yesterdayDate = new Date(nyNow);
  yesterdayDate.setDate(nyNow.getDate() - 1);
  return { today, yesterday: yesterdayDate.toLocaleDateString("en-CA") };
}

async function fetchCampusCatalog(today: string, yesterday: string): Promise<CampusCatalog> {
  const supabase = createClient();
  const { data: halls } = await supabase.from("dining_halls").select("*").order("name");
  if (!halls) throw new Error("Could not load locations.");

  const [{ data: hoursData }, { data: priorHoursData }] = await Promise.all([
    supabase.from("operating_hours").select("*").eq("date", today),
    supabase.from("operating_hours").select("*").eq("date", yesterday),
  ]);

  return {
    halls: halls as HallRow[],
    today,
    yesterday,
    hours: [...(hoursData ?? []), ...(priorHoursData ?? [])],
  };
}

async function fetchCapacity(): Promise<Record<string, number>> {
  try {
    const capRes = await fetch("/api/dining/capacity", { cache: "no-store" });
    if (!capRes.ok) return {};
    const json = (await capRes.json()) as CapacityApiResponse;
    const capMap: Record<string, number> = {};
    json.data.forEach((entry) => {
      capMap[entry.name] = entry.capacity_count;
    });
    return capMap;
  } catch (err) {
    console.error("Capacity fetch failed", err);
    return {};
  }
}

function shapeLocations(catalog: CampusCatalog, capMap: Record<string, number>): CampusLocation[] {
  const hoursFor = (hallId: string, date: string) =>
    catalog.hours.filter((row) => row.dining_hall_id === hallId && row.date === date);

  return catalog.halls.map((loc) => {
    const statusCalc = determineHallStatus(
      hoursFor(loc.id, catalog.today),
      undefined,
      hoursFor(loc.id, catalog.yesterday),
    );

    const hasContact = loc.address != null || loc.phone != null || loc.website != null;
    const contact = hasContact
      ? {
          address: loc.address ?? undefined,
          phone: loc.phone ?? undefined,
          website: loc.website ?? undefined,
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
        details: statusCalc.details,
      },
      average_rating: loc.avg_rating,
      review_count: loc.review_count,
    };

    if (loc.type === "DINING HALLS" || loc.type === "DINING_HALLS") {
      const capacity_count = capMap[loc.name];
      let capacity = { label: "Quiet", color: "green", percentage: 0 };

      if (!base.status.isOpen) {
        capacity = { label: "Closed", color: "gray", percentage: 0 };
      } else if (capacity_count && capacity_count > 0) {
        const label = capacity_count > 70 ? "Busy" : capacity_count > 40 ? "Moderate" : "Quiet";
        const color = capacity_count > 70 ? "red" : capacity_count > 40 ? "orange" : "green";
        capacity = { label, color, percentage: capacity_count };
      }

      return { ...base, type: "DINING_HALLS", capacity } as DiningHallLocation;
    }

    return {
      ...base,
      type: loc.type as "CAFES" | "MARKETS",
    } as RetailLocation;
  });
}

export function useCampusLocations() {
  const { today, yesterday } = campusDates();
  const catalog = useQuery({
    queryKey: ["campus-catalog", today],
    queryFn: () => fetchCampusCatalog(today, yesterday),
    ...catalogQuery,
  });
  const hasDiningHalls = (catalog.data?.halls ?? []).some(
    (hall) => hall.type === "DINING HALLS" || hall.type === "DINING_HALLS",
  );
  const capacity = useQuery({
    queryKey: ["dining-capacity"],
    queryFn: fetchCapacity,
    enabled: hasDiningHalls,
    staleTime: CAPACITY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const locations = useMemo(
    () => (catalog.data ? shapeLocations(catalog.data, capacity.data ?? {}) : []),
    [catalog.data, capacity.data],
  );

  return { locations, loading: catalog.isPending };
}
