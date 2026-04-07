"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLocationsList } from "@/hooks/use-locations-list";
import { useMdUp } from "@/hooks/use-md-up";
import { useMobileLocationsDrawerSwipe } from "@/hooks/use-mobile-locations-drawer-swipe";
import { LocationListCard } from "@/components/locations/LocationListCard";
import { LocationDetailPanel } from "@/components/locations/detail-panel/LocationDetailPanel";
import { Search, Loader2, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appGhostIconButtonClassName } from "@/lib/button-styles";
import { HEADER_HEIGHT } from "@/components/layout/constants";
import type { LocationSummary } from "@/types/location-summary";

const LocationMap = dynamic(() => import("@/components/locations/LocationMap"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full flex items-center justify-center bg-background text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <span className="sr-only">Loading map</span>
    </div>
  ),
});

function findSelectionBySlug(
  locations: LocationSummary[],
  slug: string,
): { parentId: string; venueId: string } | null {
  for (const loc of locations) {
    if (loc.slug === slug) return { parentId: loc.id, venueId: loc.id };
    for (const c of loc.children ?? []) {
      if (c.slug === slug) return { parentId: loc.id, venueId: c.id };
    }
  }
  return null;
}

/** Sync `/locations#<venue-slug>` without adding a history entry. */
function replaceLocationsHash(slug: string | null) {
  if (typeof window === "undefined") return;
  const base = `${window.location.pathname}${window.location.search}`;
  const url = slug ? `${base}#${encodeURIComponent(slug)}` : base;
  window.history.replaceState(null, "", url);
}

export default function LocationsView() {
  const mdUp = useMdUp();
  const { locations, isLoading, userLocation } = useLocationsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  /** Mobile: list drawer opened from floating search (not from pin). */
  const [mobileListDrawerOpen, setMobileListDrawerOpen] = useState(false);

  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const blurCloseTimerRef = useRef<number | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  /** After first `locations` load, we have applied initial `window.location.hash` (if any). */
  const initialHashAppliedRef = useRef(false);

  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations;
    return locations.filter((l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  const selectedLocation = locations.find((l) => l.id === selectedId);

  const handleSelectLocation = (id: string) => {
    if (!id) {
      setSelectedId(null);
      setActiveVenueId(null);
      return;
    }
    setSelectedId(id);
    setActiveVenueId(id);
  };

  const handleChildSelect = (parentId: string, childId: string) => {
    setSelectedId(parentId);
    setActiveVenueId(childId);
  };

  const isActiveVenueInSelectedLocation =
    selectedLocation &&
    activeVenueId &&
    (selectedLocation.id === activeVenueId ||
      selectedLocation.children?.some((c) => c.id === activeVenueId));
  const initialVenueId = isActiveVenueInSelectedLocation ? activeVenueId : undefined;

  const mobileDrawerOpen = !mdUp && (mobileListDrawerOpen || selectedId !== null);

  useEffect(() => {
    if (!mdUp && mobileListDrawerOpen && !selectedId) {
      const id = requestAnimationFrame(() => mobileSearchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [mdUp, mobileListDrawerOpen, selectedId]);

  const clearBlurTimer = () => {
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (blurCloseTimerRef.current) {
        clearTimeout(blurCloseTimerRef.current);
        blurCloseTimerRef.current = null;
      }
    };
  }, []);

  const closeMobileListDrawer = () => {
    setMobileListDrawerOpen(false);
    setSearchQuery("");
  };

  const handleMobileSearchBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    clearBlurTimer();
    const next = e.relatedTarget as Node | null;
    const drawer = e.currentTarget.closest('[role="dialog"]');
    if (drawer && next && drawer.contains(next)) {
      return;
    }
    blurCloseTimerRef.current = window.setTimeout(() => {
      blurCloseTimerRef.current = null;
      if (!selectedIdRef.current) closeMobileListDrawer();
    }, 180);
  };

  const handleOpenMobileSearchDrawer = () => {
    clearBlurTimer();
    setMobileListDrawerOpen(true);
  };

  const handleBackFromMobileList = () => {
    clearBlurTimer();
    closeMobileListDrawer();
  };

  const handleDetailBack = () => {
    setSelectedId(null);
    setActiveVenueId(null);
  };

  // Hydrate selection from `#slug` once, then keep hash aligned with the active venue.
  useEffect(() => {
    if (!locations.length || typeof window === "undefined") return;

    if (!initialHashAppliedRef.current) {
      initialHashAppliedRef.current = true;
      const raw = window.location.hash.slice(1);
      if (raw) {
        const slug = decodeURIComponent(raw);
        const sel = findSelectionBySlug(locations, slug);
        if (sel) {
          setSelectedId(sel.parentId);
          setActiveVenueId(sel.venueId);
        }
      }
      return;
    }

    if (!selectedId || !activeVenueId || !selectedLocation) {
      if (window.location.hash) replaceLocationsHash(null);
      return;
    }
    const venues = [selectedLocation, ...(selectedLocation.children ?? [])];
    const activeVenue = venues.find((v) => v.id === activeVenueId);
    const slug = activeVenue?.slug;
    if (!slug) return;
    const current = window.location.hash.slice(1);
    if (decodeURIComponent(current) !== slug) {
      replaceLocationsHash(slug);
    }
  }, [locations, selectedId, activeVenueId, selectedLocation]);

  // Browser back/forward changes to the hash
  useEffect(() => {
    const onHashChange = () => {
      const raw = window.location.hash.slice(1);
      if (!raw) {
        setSelectedId(null);
        setActiveVenueId(null);
        return;
      }
      if (!locations.length) return;
      const slug = decodeURIComponent(raw);
      const sel = findSelectionBySlug(locations, slug);
      if (sel) {
        setSelectedId(sel.parentId);
        setActiveVenueId(sel.venueId);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [locations]);

  const { dragX, drawerTouchHandlers } = useMobileLocationsDrawerSwipe({
    mdUp,
    mobileDrawerOpen,
    selectedId,
    onCloseListDrawer: () => {
      clearBlurTimer();
      closeMobileListDrawer();
    },
    onCloseDetail: () => {
      clearBlurTimer();
      handleDetailBack();
    },
  });

  const listContent = (
    <>
      {isLoading ? (
        <div
          className="flex flex-1 items-center justify-center min-h-[200px] text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <span className="sr-only">Loading locations</span>
        </div>
      ) : filteredLocations.length > 0 ? (
        <div className="space-y-3">
          {filteredLocations.map((loc) => (
            <LocationListCard
              key={loc.id}
              data={loc}
              selected={selectedId === loc.id}
              onSelectVenue={(venueId) => {
                clearBlurTimer();
                setSelectedId(loc.id);
                setActiveVenueId(venueId);
                setMobileListDrawerOpen(false);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
          <Search className="w-12 h-12 mb-2 opacity-20" />
          <p>No locations found.</p>
        </div>
      )}
    </>
  );

  return (
    <div
      className="relative box-border flex h-dvh max-h-dvh w-full flex-col overflow-hidden md:flex-row"
      style={{ paddingTop: HEADER_HEIGHT }}
    >
      {/* Desktop: sidebar */}
      <aside
        className={`
          z-20 hidden md:flex w-full flex-col bg-background/95 backdrop-blur border-r border-border shadow-xl
          h-full md:w-[400px] lg:w-[450px] shrink-0
        `}
      >
        {selectedId && selectedLocation ? (
          <LocationDetailPanel
            key={`${selectedId}-${initialVenueId ?? selectedId}`}
            data={selectedLocation}
            initialVenueId={initialVenueId}
            onActiveVenueChange={setActiveVenueId}
            onBack={handleDetailBack}
          />
        ) : (
          <>
            <div className="p-4 border-b border-border bg-background/95 sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search dining halls, cafes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-muted border border-transparent focus:border-muted-foreground rounded-full text-sm outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground rounded-full"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-4 no-scrollbar">
              {listContent}
            </div>
          </>
        )}
      </aside>

      {/* Map */}
      <main className="flex-1 relative h-full w-full min-h-0 bg-muted">
        <LocationMap
          locations={filteredLocations}
          selectedId={selectedId}
          activeVenueId={activeVenueId}
          onSelect={handleSelectLocation}
          onChildSelect={handleChildSelect}
          userLocation={userLocation}
        />

        {/* Mobile: floating search — opens list drawer */}
        {!mdUp && !mobileDrawerOpen && (
          <div className="absolute top-4 left-4 right-16 z-30 max-w-md pointer-events-none [&>*]:pointer-events-auto">
            <button
              type="button"
              onClick={handleOpenMobileSearchDrawer}
              className="flex w-full items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2.5 text-left text-sm shadow-lg backdrop-blur-md transition-colors hover:bg-muted/80"
              aria-expanded={mobileListDrawerOpen}
              aria-haspopup="dialog"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-muted-foreground">
                Search dining halls, cafes…
              </span>
            </button>
          </div>
        )}

        {/* Mobile: slide-in drawer (list or detail) */}
        {!mdUp && (
          <div
            className={`
              fixed left-0 bottom-0 z-40 flex w-full max-w-full flex-col bg-background shadow-xl touch-pan-y
              ${mobileDrawerOpen ? "" : "pointer-events-none"}
              ${dragX > 0 ? "transition-none" : "transition-transform duration-300 ease-out"}
            `}
            style={{
              top: HEADER_HEIGHT,
              height: `calc(100vh - ${HEADER_HEIGHT})`,
              transform: mobileDrawerOpen
                ? `translateX(${-dragX}px)`
                : "translateX(-100%)",
            }}
            aria-hidden={!mobileDrawerOpen}
            role="dialog"
            aria-modal={mobileDrawerOpen ? true : undefined}
            {...drawerTouchHandlers}
          >
            {selectedId && selectedLocation ? (
              <LocationDetailPanel
                key={`${selectedId}-${initialVenueId ?? selectedId}`}
                data={selectedLocation}
                initialVenueId={initialVenueId}
                onActiveVenueChange={setActiveVenueId}
                onBack={handleDetailBack}
              />
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background p-3">
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      ref={mobileSearchRef}
                      type="text"
                      inputMode="search"
                      role="searchbox"
                      autoComplete="off"
                      placeholder="Search dining halls, cafes…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={clearBlurTimer}
                      onBlur={handleMobileSearchBlur}
                      onMouseDown={clearBlurTimer}
                      className="w-full h-10 pl-9 pr-9 bg-muted border border-transparent focus:border-muted-foreground rounded-full text-sm outline-none transition-all"
                      enterKeyHint="search"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground rounded-full"
                        aria-label="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={appGhostIconButtonClassName}
                    onClick={handleBackFromMobileList}
                    aria-label="Show map"
                    data-no-drawer-swipe
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 no-scrollbar">
                  {listContent}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
