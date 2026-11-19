"use client";

import type { LayerSpecification } from "maplibre-gl";
import { Layer, Source } from "react-map-gl/maplibre";
import type { CampusBuildingsGeoJson } from "./use-campus-buildings";
import { FO_BUILDINGS_SOURCE } from "@/lib/locations/footprints";
import {
  CAMPUS_LAYERS,
  CAMPUS_SOURCES,
  EMPTY_COLLECTION,
  campusSourceLoadZoom,
} from "@/lib/locations/campus-detail-style";
import { useMaxZoomReached } from "./use-map-zoom";

// U-M Facilities & Operations campus detail: lawns, sidewalks, buildings,
// water, athletic fields, walls and trees, drawn above the street basemap
// and below its labels. Building footprints are passed in so the same
// download can highlight the hall under a pin.
export function CampusDetailLayers({
  theme,
  buildings,
}: {
  theme: "light" | "dark";
  buildings: CampusBuildingsGeoJson | null;
}) {
  const zoom = useMaxZoomReached();

  return (
    <>
      {CAMPUS_SOURCES.map(([id, source]) => {
        const data =
          id === FO_BUILDINGS_SOURCE
            ? (buildings ?? EMPTY_COLLECTION)
            : zoom >= campusSourceLoadZoom(id)
              ? source.data
              : EMPTY_COLLECTION;
        return (
          <Source key={id} id={id} type="geojson" data={data} attribution={source.attribution}>
            {CAMPUS_LAYERS.filter((layer) => layer.source === id).map((variants) => {
              const spec = variants[theme];
              return (
                <Layer key={spec.id} {...(spec as unknown as LayerSpecification)} />
              );
            })}
          </Source>
        );
      })}
    </>
  );
}
