"use client";

import { useRef, useEffect } from "react";
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ANN_ARBOR_CAMPUS_BOUNDS,
  CAMPUS_MAP_MAX_ZOOM,
  CAMPUS_MAP_MIN_ZOOM,
} from "@/lib/locations/map-bounds";
import { LocationSummary } from "@/types/location-summary";
import { useTheme } from "next-themes";
import { ClusterPin } from "./ClusterPin";

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

export default function LocationMap({ locations, selectedId, activeVenueId, onSelect, onChildSelect, userLocation }: Props) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();

  // Switch map style based on theme
  const mapStyleId = resolvedTheme === "light"
    ? "dataviz-v4"
    : "019c7246-db79-7039-ad61-ed0035a09174";

  const mapStyle = `https://api.maptiler.com/maps/${mapStyleId}/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`;

  // Fly to location when selected via sidebar
  useEffect(() => {
    if (selectedId && mapRef.current) {
      const loc = locations.find((l) => l.id === selectedId);
      if (loc) {
        mapRef.current.flyTo({
          center: [loc.lng, loc.lat],
          zoom: 16,
          pitch: 45,
          duration: 1500,
        });
      }
    }
  }, [selectedId, locations]);

  return (
    <div className="h-full w-full relative bg-slate-950">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: -83.738,
          latitude: 42.278,
          zoom: 13.5,
          pitch: 0,
        }}
        minZoom={CAMPUS_MAP_MIN_ZOOM}
        maxZoom={CAMPUS_MAP_MAX_ZOOM}
        maxBounds={ANN_ARBOR_CAMPUS_BOUNDS}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        onClick={(e) => {
           // Deselect if clicking on empty map space
           if (e.originalEvent.defaultPrevented) return;
           onSelect("");
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* User Location Pulse */}
        {userLocation && (
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude}>
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-border shadow-lg"></span>
            </div>
          </Marker>
        )}

        {/* Location Markers */}
        {locations.map((loc) => {
          const isSelected = selectedId === loc.id;
          const selectedChildId =
            isSelected && activeVenueId && loc.children?.some((c) => c.id === activeVenueId)
              ? activeVenueId
              : null;

          return (
            <Marker
              key={loc.id}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect(loc.id);
              }}
            >
              <div className={`group relative flex flex-col items-center cursor-pointer ${isSelected ? "z-50" : "z-10"}`}>

                <ClusterPin
                  mainLocation={loc}
                  isSelected={isSelected}
                  selectedChildId={selectedChildId}
                  onChildClick={(childId) => {
                    onChildSelect?.(loc.id, childId);
                  }}
                />

                {/* Hover label: only when not selected (selected state shows name below pin in ClusterPin) */}
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
