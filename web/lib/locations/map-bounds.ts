import type { LngLatBoundsLike } from "maplibre-gl";

/**
 * Pan/zoom clamp for the campus map: central Ann Arbor / U-M area.
 * [[west, south], [east, north]] — MapLibre `maxBounds`.
 */
export const ANN_ARBOR_CAMPUS_BOUNDS: LngLatBoundsLike = [
  [-83.785, 42.248],
  [-83.678, 42.318],
];

/** Do not zoom out past a campus-wide overview. */
export const CAMPUS_MAP_MIN_ZOOM = 12;

/** Street-level cap (tiles still load; avoids excessive zoom). */
export const CAMPUS_MAP_MAX_ZOOM = 19;
