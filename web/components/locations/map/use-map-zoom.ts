"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/maplibre";

/** Zoom after the latest gesture. Sources that load once stay loaded. */
export function useMaxZoomReached() {
  const { current } = useMap();
  const map = current?.getMap();
  const [zoom, setZoom] = useState(() => map?.getZoom() ?? 0);
  const [max, setMax] = useState(zoom);

  useEffect(() => {
    if (!map) return;
    const update = () => setZoom(map.getZoom());
    update();
    map.on("zoomend", update);
    return () => {
      map.off("zoomend", update);
    };
  }, [map]);

  useEffect(() => {
    setMax((currentMax) => (zoom > currentMax ? zoom : currentMax));
  }, [zoom]);

  return Math.max(max, zoom);
}
