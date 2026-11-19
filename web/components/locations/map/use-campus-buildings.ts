"use client";

import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import { indexFootprints, type FootprintIndex } from "@/lib/locations/footprints";

export type CampusBuildingsGeoJson = FeatureCollection;

// One download of the building footprints, shared by the map layer and the
// pin matcher.
export function useCampusBuildings() {
  const [geojson, setGeojson] = useState<CampusBuildingsGeoJson | null>(null);
  const [index, setIndex] = useState<FootprintIndex | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/campus-map/9-buildings.geojson")
      .then((response) => {
        if (!response.ok) throw new Error(`Building footprints failed to load (${response.status})`);
        return response.json() as Promise<CampusBuildingsGeoJson>;
      })
      .then((data) => {
        if (cancelled) return;
        setGeojson(data);
        setIndex(indexFootprints(data));
      })
      .catch((error: unknown) => {
        console.error("Campus building footprints failed to load", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { geojson, index };
}
