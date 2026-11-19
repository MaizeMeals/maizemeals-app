/**
 * Building footprints from the U-M Facilities & Operations campus map
 * (public/campus-map/9-buildings.geojson). A dining pin highlights the
 * footprint it falls in, or the nearest hall with the same name when the
 * pin sits in a courtyard or just outside the walls.
 */

export const FO_BUILDINGS_SOURCE = "fo-9";
export const BUILDINGS_HIT_LAYER = "buildings-hit";

const STOP_WORDS = new Set([
  "hall",
  "dining",
  "cafe",
  "cafes",
  "market",
  "markets",
  "commons",
  "complex",
  "the",
  "at",
  "and",
  "center",
  "building",
  "residence",
  "residences",
  "of",
]);

/** How close a pin outside every footprint can be and still claim the nearest one. */
const NEAREST_METERS = 40;
/** A uniquely named hall can claim a pin this far from its walls (courtyards, doors). */
const NAME_METERS = 100;

type Ring = number[][];
type PolygonRings = Ring[];

export type Footprint = {
  recordNumber: string;
  names: string[];
  /** West, south, east, north. */
  bbox: [number, number, number, number];
  polygons: PolygonRings[];
};

export type FootprintIndex = Footprint[];

export type VenuePoint = {
  parentId: string;
  venueId: string;
  name: string;
  lng: number;
  lat: number;
};

export type VenueFootprint = VenuePoint & { recordNumber: string | null };

type GeoFeature = {
  properties?: { [name: string]: unknown } | null;
  geometry?: { type?: string; coordinates?: unknown } | null;
};

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * 3 when every distinctive word of the venue is in the building name
 * ("Bursley" → "Bursley Hall", "East Quad" → "East Quad").
 * 1 for a partial overlap ("Taubman" inside "Java Blu at Taubman").
 */
export function nameMatchScore(venueName: string, buildingNames: readonly string[]): number {
  const venue = nameTokens(venueName);
  if (!venue.length) return 0;
  const building = new Set(buildingNames.flatMap(nameTokens));
  if (!building.size) return 0;
  const hits = venue.filter((token) => building.has(token)).length;
  if (hits === venue.length) return 3;
  return hits > 0 ? 1 : 0;
}

export function indexFootprints(geojson: { features?: GeoFeature[] | null }): FootprintIndex {
  const byRecord = new Map<string, Footprint>();

  for (const feature of geojson.features ?? []) {
    const raw = feature.properties?.loc_ObjectNum;
    if (raw == null || raw === "") continue;
    const recordNumber = String(raw);
    const polygons = polygonsOf(feature.geometry);
    if (!polygons.length) continue;

    let entry = byRecord.get(recordNumber);
    if (!entry) {
      entry = {
        recordNumber,
        names: [],
        bbox: [Infinity, Infinity, -Infinity, -Infinity],
        polygons: [],
      };
      byRecord.set(recordNumber, entry);
    }

    const name = feature.properties?.ObjectName;
    if (typeof name === "string" && name.trim() && !entry.names.includes(name.trim())) {
      entry.names.push(name.trim());
    }
    for (const polygon of polygons) {
      entry.polygons.push(polygon);
      expandBbox(entry.bbox, polygon);
    }
  }

  return [...byRecord.values()];
}

export function matchFootprint(
  index: FootprintIndex,
  lng: number,
  lat: number,
  name?: string | null,
): string | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const containing: { footprint: Footprint; area: number }[] = [];
  const strong: { footprint: Footprint; distance: number }[] = [];
  let nearest: { footprint: Footprint; distance: number } | null = null;

  for (const footprint of index) {
    if (!bboxNear(footprint.bbox, lng, lat, NAME_METERS)) continue;
    const inside = footprintContains(footprint, lng, lat);
    const distance = inside ? 0 : distanceToFootprint(footprint, lng, lat);
    if (inside) containing.push({ footprint, area: footprintArea(footprint) });
    if (!nearest || distance < nearest.distance) nearest = { footprint, distance };
    if (name && nameMatchScore(name, footprint.names) >= 3) {
      strong.push({ footprint, distance });
    }
  }

  const namedNearby = strong.filter((item) => item.distance <= NAME_METERS);

  if (containing.length) {
    const namedInside = containing.filter((item) =>
      namedNearby.some((named) => named.footprint.recordNumber === item.footprint.recordNumber),
    );
    if (namedInside.length) {
      namedInside.sort((a, b) => a.area - b.area);
      return namedInside[0].footprint.recordNumber;
    }
    // The pin landed inside a neighbor (a shed, a wing). A single hall whose
    // name matches still owns the pin when that hall is close.
    if (namedNearby.length === 1) return namedNearby[0].footprint.recordNumber;
    containing.sort((a, b) => a.area - b.area);
    return containing[0].footprint.recordNumber;
  }

  if (namedNearby.length === 1) return namedNearby[0].footprint.recordNumber;
  if (namedNearby.length > 1) {
    namedNearby.sort((a, b) => a.distance - b.distance);
    return namedNearby[0].footprint.recordNumber;
  }
  if (nearest && nearest.distance <= NEAREST_METERS) return nearest.footprint.recordNumber;
  return null;
}

export function assignVenueFootprints(venues: VenuePoint[], index: FootprintIndex): VenueFootprint[] {
  return venues.map((venue) => ({
    ...venue,
    recordNumber: matchFootprint(index, venue.lng, venue.lat, venue.name),
  }));
}

/** Footprint to outline for the open location, preferring the active child venue. */
export function recordForVenueGroup(
  venues: VenueFootprint[],
  parentId: string | null,
  activeVenueId?: string | null,
): string | null {
  if (!parentId) return null;
  if (activeVenueId) {
    const active = venues.find((venue) => venue.parentId === parentId && venue.venueId === activeVenueId);
    if (active?.recordNumber) return active.recordNumber;
  }
  const parent = venues.find((venue) => venue.venueId === parentId);
  if (parent?.recordNumber) return parent.recordNumber;
  return venues.find((venue) => venue.parentId === parentId && venue.recordNumber)?.recordNumber ?? null;
}

/** Which location pin a click on a footprint should open. */
export function parentForFootprint(
  venues: VenueFootprint[],
  recordNumber: string,
  lng: number,
  lat: number,
): string | null {
  const hits = venues.filter((venue) => venue.recordNumber === recordNumber);
  if (!hits.length) return null;

  const parents = new Map<string, VenueFootprint[]>();
  for (const hit of hits) {
    const list = parents.get(hit.parentId);
    if (list) list.push(hit);
    else parents.set(hit.parentId, [hit]);
  }
  if (parents.size === 1) return hits[0].parentId;

  let best: { id: string; distance: number } | null = null;
  for (const [parentId, list] of parents) {
    const pin = list.find((venue) => venue.venueId === parentId) ?? list[0];
    const distance = distanceMeters(lng, lat, pin.lng, pin.lat);
    if (!best || distance < best.distance) best = { id: parentId, distance };
  }
  return best?.id ?? null;
}

function polygonsOf(geometry: GeoFeature["geometry"]): PolygonRings[] {
  if (!geometry?.coordinates) return [];
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return [geometry.coordinates as PolygonRings];
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates as PolygonRings[];
  }
  return [];
}

function expandBbox(bbox: [number, number, number, number], polygon: PolygonRings) {
  for (const ring of polygon) {
    for (const coord of ring) {
      const lng = coord[0];
      const lat = coord[1];
      if (lng < bbox[0]) bbox[0] = lng;
      if (lat < bbox[1]) bbox[1] = lat;
      if (lng > bbox[2]) bbox[2] = lng;
      if (lat > bbox[3]) bbox[3] = lat;
    }
  }
}

function metersScale(lat: number) {
  const latRad = (lat * Math.PI) / 180;
  return { lng: 111_320 * Math.cos(latRad), lat: 111_320 };
}

function bboxNear(
  bbox: [number, number, number, number],
  lng: number,
  lat: number,
  meters: number,
): boolean {
  if (!Number.isFinite(bbox[0])) return false;
  const scale = metersScale(lat);
  const padLng = meters / scale.lng;
  const padLat = meters / scale.lat;
  return lng >= bbox[0] - padLng && lng <= bbox[2] + padLng && lat >= bbox[1] - padLat && lat <= bbox[3] + padLat;
}

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function footprintContains(footprint: Footprint, lng: number, lat: number): boolean {
  if (!bboxNear(footprint.bbox, lng, lat, 0)) return false;
  for (const polygon of footprint.polygons) {
    const [outer, ...holes] = polygon;
    if (!outer) continue;
    if (pointInRing(lng, lat, outer) && !holes.some((hole) => pointInRing(lng, lat, hole))) return true;
  }
  return false;
}

function distanceMeters(lng: number, lat: number, otherLng: number, otherLat: number): number {
  const scale = metersScale(lat);
  return Math.hypot((otherLng - lng) * scale.lng, (otherLat - lat) * scale.lat);
}

function distanceToSegment(
  lng: number,
  lat: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const scale = metersScale(lat);
  const axm = (ax - lng) * scale.lng;
  const aym = (ay - lat) * scale.lat;
  const bxm = (bx - lng) * scale.lng;
  const bym = (by - lat) * scale.lat;
  const dx = bxm - axm;
  const dy = bym - aym;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(axm, aym);
  const t = Math.max(0, Math.min(1, (-axm * dx + -aym * dy) / len2));
  return Math.hypot(axm + t * dx, aym + t * dy);
}

function distanceToFootprint(footprint: Footprint, lng: number, lat: number): number {
  let best = Infinity;
  for (const polygon of footprint.polygons) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i++) {
        const d = distanceToSegment(lng, lat, ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1]);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

function ringArea(ring: Ring): number {
  if (ring.length < 4) return 0;
  const scale = metersScale(ring[0][1]);
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0] * scale.lng;
    const y1 = ring[i][1] * scale.lat;
    const x2 = ring[i + 1][0] * scale.lng;
    const y2 = ring[i + 1][1] * scale.lat;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function footprintArea(footprint: Footprint): number {
  let area = 0;
  for (const polygon of footprint.polygons) {
    const [outer, ...holes] = polygon;
    if (!outer) continue;
    area += ringArea(outer);
    for (const hole of holes) area -= ringArea(hole);
  }
  return Math.max(area, 0);
}
