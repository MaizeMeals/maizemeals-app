"use client";

import type { FilterSpecification } from "maplibre-gl";
import { Layer } from "react-map-gl/maplibre";
import { BUILDINGS_HIT_LAYER, FO_BUILDINGS_SOURCE } from "@/lib/locations/footprints";

export const BUILDING_HIGHLIGHT_LAYERS = [
  BUILDINGS_HIT_LAYER,
  "building-hover-fill",
  "building-hover-outline",
  "building-selected-fill",
  "building-selected-casing",
  "building-selected-outline",
] as const;

// Same maize / U-M blue as the pin (globals.css --maize, --blue).
const MAIZE = "hsl(44, 100%, 51%)";
const BLUE = "hsl(209, 100%, 15%)";
const NONE = "__none__";

function recordFilter(recordNumber: string | null): FilterSpecification {
  return ["==", ["to-string", ["get", "loc_ObjectNum"]], recordNumber ?? NONE];
}

const OUTLINE_WIDTH = ["interpolate", ["linear"], ["zoom"], 14, 2.5, 18, 5] as const;
const CASING_WIDTH = ["interpolate", ["linear"], ["zoom"], 14, 5, 18, 8] as const;

// A transparent hit target on every footprint, plus a maize fill and outline
// on the building under the hovered or selected pin.
export function BuildingHighlight({
  selectedRecord,
  hoveredRecord,
  theme,
}: {
  selectedRecord: string | null;
  hoveredRecord: string | null;
  theme: "light" | "dark";
}) {
  const hover = hoveredRecord && hoveredRecord !== selectedRecord ? hoveredRecord : null;
  const casing = theme === "light" ? BLUE : "#ffffff";

  return (
    <>
      <Layer
        id={BUILDINGS_HIT_LAYER}
        type="fill"
        source={FO_BUILDINGS_SOURCE}
        paint={{ "fill-color": "#000000", "fill-opacity": 0 }}
      />
      <Layer
        id="building-hover-fill"
        type="fill"
        source={FO_BUILDINGS_SOURCE}
        filter={recordFilter(hover)}
        paint={{ "fill-color": MAIZE, "fill-opacity": 0.2 }}
      />
      <Layer
        id="building-hover-outline"
        type="line"
        source={FO_BUILDINGS_SOURCE}
        filter={recordFilter(hover)}
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{ "line-color": MAIZE, "line-width": 2 }}
      />
      <Layer
        id="building-selected-fill"
        type="fill"
        source={FO_BUILDINGS_SOURCE}
        filter={recordFilter(selectedRecord)}
        paint={{ "fill-color": MAIZE, "fill-opacity": 0.42 }}
      />
      <Layer
        id="building-selected-casing"
        type="line"
        source={FO_BUILDINGS_SOURCE}
        filter={recordFilter(selectedRecord)}
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{ "line-color": casing, "line-width": CASING_WIDTH as unknown as number }}
      />
      <Layer
        id="building-selected-outline"
        type="line"
        source={FO_BUILDINGS_SOURCE}
        filter={recordFilter(selectedRecord)}
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{ "line-color": MAIZE, "line-width": OUTLINE_WIDTH as unknown as number }}
      />
    </>
  );
}
