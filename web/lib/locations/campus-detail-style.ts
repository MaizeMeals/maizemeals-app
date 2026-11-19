import type { FilterSpecification, LayerSpecification } from "maplibre-gl";
import campusStyleJson from "@/public/campus-map/style.json";

type CampusLayer = {
  id: string;
  type: string;
  source: string;
  minzoom?: number;
  filter?: FilterSpecification;
  layout?: LayerSpecification["layout"];
  paint?: LayerSpecification["paint"];
  metadata?: unknown;
};

type CampusStyle = {
  sources: Record<string, { type: "geojson"; data: string; attribution?: string }>;
  layers: CampusLayer[];
};

// Generated snapshot of the U-M Facilities & Operations campus map. fo-20
// (a full-area background) and fo-10 (city road surface) would hide the
// street basemap, so they stay out and the campus detail draws on top of it.
const campusStyle = campusStyleJson as CampusStyle;

export const SKIPPED_CAMPUS_SOURCES = new Set(["fo-20", "fo-10"]);

// Heavier layers (lawns, sidewalks) wait until the map is close enough to
// show them. Their GeoJSON is fetched once and kept if the user zooms back out.
export const CAMPUS_LOAD_FLOOR = 14;

const EMPTY_COLLECTION = { type: "FeatureCollection" as const, features: [] as never[] };
export { EMPTY_COLLECTION };

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    t = (t + 1) % 1;
    const c = t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(c * 255);
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

// FO's colors are drawn for a light map. On the dark basemap, flip each
// color's lightness and mute its saturation, keeping the hue.
export function campusPaintForDark(value: unknown): unknown {
  if (typeof value === "string") {
    const match = value.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
    if (!match) return value;
    const [h, s, l] = rgbToHsl(+match[1], +match[2], +match[3]);
    const [r, g, b] = hslToRgb(h, s * 0.45, 0.1 + (1 - l) * 0.55);
    return `rgba(${r}, ${g}, ${b}, ${match[4]})`;
  }
  if (Array.isArray(value)) return value.map(campusPaintForDark);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, campusPaintForDark(item)]));
  }
  return value;
}

export type PreparedCampusLayer = {
  source: string;
  light: Omit<CampusLayer, "metadata" | "source">;
  dark: Omit<CampusLayer, "metadata" | "source">;
};

export const CAMPUS_LAYERS: PreparedCampusLayer[] = campusStyle.layers
  .filter((layer) => !SKIPPED_CAMPUS_SOURCES.has(layer.source))
  .map((layer) => {
    const spec: Omit<CampusLayer, "metadata" | "source"> = {
      id: layer.id,
      type: layer.type,
      paint: layer.paint,
    };
    if (layer.minzoom != null) spec.minzoom = layer.minzoom;
    if (layer.filter) spec.filter = layer.filter;
    if (layer.layout) spec.layout = layer.layout;
    return {
      source: layer.source,
      light: spec,
      dark: { ...spec, paint: campusPaintForDark(spec.paint) as CampusLayer["paint"] },
    };
  });

export const CAMPUS_SOURCES = Object.entries(campusStyle.sources).filter(
  ([id]) => !SKIPPED_CAMPUS_SOURCES.has(id),
);

export function campusSourceLoadZoom(id: string): number {
  const mins = campusStyle.layers.filter((layer) => layer.source === id).map((layer) => layer.minzoom ?? 0);
  if (!mins.length) return CAMPUS_LOAD_FLOOR;
  return Math.max(CAMPUS_LOAD_FLOOR, Math.min(...mins));
}
