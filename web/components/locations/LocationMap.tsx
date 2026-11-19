"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ANN_ARBOR_CAMPUS_BOUNDS,
  CAMPUS_MAP_MAX_ZOOM,
  CAMPUS_MAP_MIN_ZOOM,
} from "@/lib/locations/map-bounds";
import { mapStyleUrl } from "@/lib/locations/map-style";
import {
  assignVenueFootprints,
  BUILDINGS_HIT_LAYER,
  parentForFootprint,
  recordForVenueGroup,
  type VenuePoint,
} from "@/lib/locations/footprints";
import { LocationSummary } from "@/types/location-summary";
import { useTheme } from "next-themes";
import { ClusterPin } from "./ClusterPin";
import { BuildingHighlight } from "./map/BuildingHighlight";
import { CampusDetailLayers } from "./map/CampusDetailLayers";
import { LayerSlots } from "./map/LayerSlots";
import { useCampusBuildings } from "./map/use-campus-buildings";

interface Props {
  locations: LocationSummary[];
  selectedId: string | null;
  /** When the detail panel is showing a child venue at this location, its id (so we can highlight that sub-pin). */
  activeVenueId?: string | null;
  onSelect: (id: string) => void;
  /** Called when user clicks a child pin (e.g. café); parent should set selectedId to parent and activeVenueId to childId. */
  onChildSelect?: (parentId: string, childId: string) => void;
  userLocation: { latitude: number; longitude: number } | null;
}

function venuePoints(locations: LocationSummary[]): VenuePoint[] {
  return locations.flatMap((loc) =>
    [loc, ...(loc.children ?? [])].map((venue) => ({
      parentId: loc.id,
      venueId: venue.id,
      name: venue.name,
      lng: venue.lng,
      lat: venue.lat,
    })),
  );
}

export default function LocationMap({ locations, selectedId, activeVenueId, onSelect, onChildSelect, userLocation }: Props) {
  const mapRef = useRef<MapRef>(null);
  const cameraKeyRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";
  const { geojson: buildings, index } = useCampusBuildings();
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const hoveredId = hoveredPinId ?? hoveredBuildingId;

  const venues = useMemo(
    () => (index ? assignVenueFootprints(venuePoints(locations), index) : []),
    [locations, index],
  );
  const selectedRecord = recordForVenueGroup(venues, selectedId, activeVenueId);
  const hoveredRecord = recordForVenueGroup(venues, hoveredId, hoveredId);

  // Fly to the pin immediately, then frame the whole footprint once it loads.
  useEffect(() => {
    const map = mapRef.current;
    if (!selectedId || !map) return;
    const loc = locations.find((item) => item.id === selectedId);
    if (!loc) return;

    if (!index) {
      const pending = `${selectedId}:pending`;
      if (cameraKeyRef.current === pending) return;
      cameraKeyRef.current = pending;
      map.flyTo({ center: [loc.lng, loc.lat], zoom: 16, pitch: 45, duration: 1500 });
      return;
    }

    const footprint = index.find((item) => item.recordNumber === selectedRecord);
    const key = footprint ? `${selectedId}:${footprint.recordNumber}` : `${selectedId}:point`;
    if (cameraKeyRef.current === key) return;
    cameraKeyRef.current = key;

    if (footprint && Number.isFinite(footprint.bbox[0])) {
      map.fitBounds(
        [
          [footprint.bbox[0], footprint.bbox[1]],
          [footprint.bbox[2], footprint.bbox[3]],
        ],
        { padding: 72, maxZoom: 17, pitch: 45, duration: 1500 },
      );
      return;
    }

    map.flyTo({ center: [loc.lng, loc.lat], zoom: 16, pitch: 45, duration: 1500 });
  }, [selectedId, locations, index, selectedRecord]);

  return (
    <div className="h-full w-full relative bg-background">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: -83.738,
          latitude: 42.278,
          zoom: 14,
          pitch: 0,
        }}
        minZoom={CAMPUS_MAP_MIN_ZOOM}
        maxZoom={CAMPUS_MAP_MAX_ZOOM}
        maxBounds={ANN_ARBOR_CAMPUS_BOUNDS}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyleUrl(resolvedTheme)}
        interactiveLayerIds={[BUILDINGS_HIT_LAYER]}
        cursor={hoveredId ? "pointer" : undefined}
        onMouseMove={(event) => {
          const raw = event.features?.[0]?.properties?.loc_ObjectNum;
          const record = raw == null || raw === "" ? null : String(raw);
          const parentId = record
            ? parentForFootprint(venues, record, event.lngLat.lng, event.lngLat.lat)
            : null;
          setHoveredBuildingId((current) => (current === parentId ? current : parentId));
        }}
        onMouseLeave={() => setHoveredBuildingId(null)}
        onClick={(event) => {
          if (event.originalEvent.defaultPrevented) return;
          const target = event.originalEvent.target;
          if (target instanceof Element && target.closest(".maplibregl-marker")) return;
          const raw = event.features?.[0]?.properties?.loc_ObjectNum;
          const record = raw == null || raw === "" ? null : String(raw);
          if (record) {
            const parentId = parentForFootprint(venues, record, event.lngLat.lng, event.lngLat.lat);
            if (parentId) {
              onSelect(parentId);
              return;
            }
          }
          onSelect("");
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <LayerSlots />
        <CampusDetailLayers theme={theme} buildings={buildings} />
        <BuildingHighlight selectedRecord={selectedRecord} hoveredRecord={hoveredRecord} theme={theme} />

        {userLocation && (
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude}>
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-border shadow-lg"></span>
            </div>
          </Marker>
        )}

        {locations.map((loc) => {
          const isSelected = selectedId === loc.id;
          const selectedChildId =
            isSelected && activeVenueId && loc.children?.some((child) => child.id === activeVenueId)
              ? activeVenueId
              : null;

          return (
            <Marker
              key={loc.id}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="bottom"
              onClick={(event) => {
                event.originalEvent.preventDefault();
                event.originalEvent.stopPropagation();
                onSelect(loc.id);
              }}
            >
              <div
                className={`group relative flex flex-col items-center cursor-pointer ${isSelected ? "z-50" : "z-10"}`}
                onMouseEnter={() => setHoveredPinId(loc.id)}
                onMouseLeave={() => setHoveredPinId((current) => (current === loc.id ? null : current))}
              >
                <ClusterPin
                  mainLocation={loc}
                  isSelected={isSelected}
                  selectedChildId={selectedChildId}
                  onChildClick={(childId) => {
                    onChildSelect?.(loc.id, childId);
                  }}
                />

                {!isSelected && (
                  <div className="absolute left-1/2 -translate-x-1/2 -top-12 px-2 py-1.5 bg-background/95 text-foreground text-[10px] font-bold rounded-md border border-border shadow-md backdrop-blur-sm pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[60]">
                    {loc.name}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
