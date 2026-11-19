const COVERED = new Set(["background", "fill", "fill-extrusion", "line", "heatmap", "hillshade", "raster"]);

// Our layers read GeoJSON. The basemap's layers read its vector or raster tiles.
const OWN_SOURCES = new Set(["geojson", "image", "video"]);

export type StackLayer = { id: string; type: string; sourceType?: string };

function isBasemap(layer: StackLayer) {
  return !layer.id.startsWith("slot-") && !OWN_SOURCES.has(layer.sourceType ?? "");
}

// Campus detail goes under the basemap's first label. Our own symbol layers
// must not count, or the slot jumps above the buildings.
export function campusDetailBeforeId(layers: StackLayer[]): string | undefined {
  return layers.find((layer) => isBasemap(layer) && layer.type === "symbol")?.id;
}

// Some styles draw fills and lines after their first label (building
// footprints, minor roads). Those would paint over the campus detail, so
// they move to just under the first label. Returns nothing once the stack
// is already in that order.
export function basemapLayersToLower(layers: StackLayer[]): { ids: string[]; beforeId: string } | null {
  const basemap = layers.filter(isBasemap);
  const first = basemap.findIndex((layer) => layer.type === "symbol");
  if (first < 0) return null;
  const ids = basemap
    .slice(first + 1)
    .filter((layer) => COVERED.has(layer.type))
    .map((layer) => layer.id);
  const beforeId = basemap[first]?.id;
  return ids.length && beforeId ? { ids, beforeId } : null;
}
