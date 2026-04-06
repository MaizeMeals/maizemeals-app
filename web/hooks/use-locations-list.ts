"use client";

import { useMemo } from "react";
import { useCampusLocations } from "@/hooks/use-campus-locations"; // The new polymorphic fetcher
import { useUserLocation } from "@/hooks/use-user-location";
import { calculateDistance } from "@/lib/distance";
import { CampusLocation, DiningHallLocation } from "@/types/location";
import { LocationSummary } from "@/types/location-summary";

const getTypeRank = (type: string) => {
  if (type === 'DINING_HALLS') return 1;
  if (type === 'CAFE') return 2;
  if (type === 'MARKET') return 3;
  return 4;
};

// Helper to convert Raw Location -> UI Summary
const mapToSummary = (loc: CampusLocation, coords: any): LocationSummary => {
  let distance = null;
  if (coords && loc.lat && loc.lng) {
    distance = calculateDistance(
      coords.latitude,
      coords.longitude,
      loc.lat,
      loc.lng
    );
  }

  // Extract capacity safely if it exists
  const capacity = (loc.type === 'DINING_HALLS')
    ? (loc as DiningHallLocation).capacity
    : undefined;

  return {
    id: loc.id,
    name: loc.name.replace(" Dining Hall", ""), // Clean name for UI
    slug: loc.slug || loc.name.toLowerCase().replace(/ /g, "-"),
    type: loc.type,
    image_url: loc.image_url,
    lat: loc.lat,
    lng: loc.lng,
    distance,
    isOpen: loc.status.isOpen,
    statusLabel: loc.status.label,
    statusColor: loc.status.color,
    capacity,
    contact: loc.contact,
    children: [], // Will be filled if this is a parent
    matchScore: null,
    heroItem: null,
    average_rating: loc.average_rating ?? undefined,
    review_count: loc.review_count ?? undefined
  };
};

export function useLocationsList() {
  const { locations: rawLocations, loading } = useCampusLocations();
  const { coords, error: locationError } = useUserLocation();

  const locations: LocationSummary[] = useMemo(() => {
    if (!rawLocations.length) return [];

    // 1. Group by official_id
    const groups: Record<string, CampusLocation[]> = {};
    const singles: CampusLocation[] = [];

    rawLocations.forEach(loc => {
      if (loc.official_id) {
        if (!groups[loc.official_id]) groups[loc.official_id] = [];
        groups[loc.official_id].push(loc);
      } else {
        singles.push(loc);
      }
    });

    const result: LocationSummary[] = [];

    // 2. Process Groups (e.g. Bursley Hall)
    Object.values(groups).forEach(group => {
      // Sort group so Dining Hall is the "Parent"
      group.sort((a, b) => getTypeRank(a.type) - getTypeRank(b.type));

      const primary = group[0];
      const children = group.slice(1);

      const parentSummary = mapToSummary(primary, coords);
      parentSummary.children = children.map(child => mapToSummary(child, coords));

      result.push(parentSummary);
    });

    // 3. Process Singles (e.g. Standalone Cafes)
    singles.forEach(loc => {
      result.push(mapToSummary(loc, coords));
    });

    // 4. Final Sort: Open First -> Closest Second
    return result.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;

      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });

  }, [rawLocations, coords]);

  return {
    locations,
    isLoading: loading,
    userLocation: coords,
    locationError
  };
}
