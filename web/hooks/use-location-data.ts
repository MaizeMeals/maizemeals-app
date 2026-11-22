"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { catalogQuery } from "@/lib/catalog-query";
import type { LocationData } from "@/types/dining";
import { loadLocationData, loadMenuEvents } from "@/lib/locations/menu";

async function fetchLocationData(slug: string, date?: string) {
  const db = createClient();
  const { data: hall, error } = await db.from("dining_halls").select("*").eq("slug", slug).single();
  if (error || !hall) throw new Error("Location not found");
  return loadLocationData(db, hall, date, async (client, hallId, day) => {
    const params = new URLSearchParams({ hall_id: hallId, date: day });
    try {
      const response = await fetch(`/recommendations?${params}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Recommendation route failed");
      const payload: { events?: Awaited<ReturnType<typeof loadMenuEvents>> } = await response.json();
      return payload.events ?? [];
    } catch {
      return loadMenuEvents(client, hallId, day);
    }
  });
}

export function useLocationData(slug: string, dateStr?: string, initialData?: LocationData) {
  const query = useQuery({
    queryKey: ["location-menu", slug, dateStr ?? "today"],
    queryFn: () => fetchLocationData(slug, dateStr),
    ...catalogQuery,
    initialData,
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
