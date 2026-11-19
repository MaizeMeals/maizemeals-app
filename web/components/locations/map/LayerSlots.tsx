"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useMap } from "react-map-gl/maplibre";
import { CAMPUS_LAYERS } from "@/lib/locations/campus-detail-style";
import { basemapLayersToLower, campusDetailBeforeId, type StackLayer } from "@/lib/locations/layer-order";
import { BUILDING_HIGHLIGHT_LAYERS } from "./BuildingHighlight";

const CAMPUS_LAYER_IDS = CAMPUS_LAYERS.map((layer) => layer.light.id);

function stackOf(map: MapLibreMap): StackLayer[] {
  return map.getLayersOrder().map((id) => {
    const layer = map.getLayer(id);
    const sourceId = layer && "source" in layer ? layer.source : undefined;
    const source = typeof sourceId === "string" ? map.getSource(sourceId) : undefined;
    return { id, type: layer?.type ?? "", sourceType: source?.type };
  });
}

function indexes(order: string[], ids: readonly string[]): number[] | null {
  const found: number[] = [];
  for (const id of ids) {
    const index = order.indexOf(id);
    if (index < 0) return null;
    found.push(index);
  }
  return found;
}

function inOrderBelow(order: string[], ids: readonly string[], beforeId: string): boolean {
  const limit = order.indexOf(beforeId);
  const found = indexes(order, ids);
  if (limit < 0 || !found) return false;
  let previous = -1;
  for (const index of found) {
    if (index >= limit || index <= previous) return false;
    previous = index;
  }
  return true;
}

function inOrderOnTop(order: string[], ids: readonly string[], aboveId: string): boolean {
  const floor = order.indexOf(aboveId);
  const found = indexes(order, ids);
  if (floor < 0 || !found) return false;
  let previous = floor;
  for (const index of found) {
    if (index <= previous) return false;
    previous = index;
  }
  return true;
}

// Keep U-M campus detail under the street labels, and the selected building
// outline above every label. Moving a layer fires styledata, so this bails
// out once the stack is already in order.
function placeLayers(map: MapLibreMap) {
  const lowered = basemapLayersToLower(stackOf(map));
  if (lowered) {
    for (const id of lowered.ids) {
      if (map.getLayer(id)) map.moveLayer(id, lowered.beforeId);
    }
  }

  const anchor = campusDetailBeforeId(stackOf(map));
  if (!anchor || !map.getLayer(anchor)) return;

  const campusReady = CAMPUS_LAYER_IDS.every((id) => map.getLayer(id));
  if (campusReady && !inOrderBelow(map.getLayersOrder(), CAMPUS_LAYER_IDS, anchor)) {
    for (const id of CAMPUS_LAYER_IDS) map.moveLayer(id, anchor);
  }

  const highlightsReady = BUILDING_HIGHLIGHT_LAYERS.every((id) => map.getLayer(id));
  if (highlightsReady && !inOrderOnTop(map.getLayersOrder(), BUILDING_HIGHLIGHT_LAYERS, anchor)) {
    for (const id of BUILDING_HIGHLIGHT_LAYERS) map.moveLayer(id);
  }
}

export function LayerSlots() {
  const map = useMap().current?.getMap();
  const placing = useRef(false);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      if (placing.current) return;
      placing.current = true;
      try {
        placeLayers(map);
      } finally {
        placing.current = false;
      }
    };
    if (map.isStyleLoaded()) update();
    map.on("styledata", update);
    return () => {
      map.off("styledata", update);
    };
  }, [map]);

  return null;
}
