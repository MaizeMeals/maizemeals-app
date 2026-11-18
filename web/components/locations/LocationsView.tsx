"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePreferences } from "@/hooks/usePreferences";
import { DietaryEssentialsSheet } from "@/components/preferences/DietaryEssentialsSheet";
import { useLocationsList } from "@/hooks/use-locations-list";
import { useMdUp } from "@/hooks/use-md-up";
import { useMobileLocationsDrawerSwipe } from "@/hooks/use-mobile-locations-drawer-swipe";
import { LocationListCard } from "@/components/locations/LocationListCard";
import { LocationDetailPanel } from "@/components/locations/detail-panel/LocationDetailPanel";
import { Search, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { appGhostIconButtonClassName } from "@/lib/button-styles";
import { HEADER_HEIGHT } from "@/components/layout/constants";
import type { LocationSummary } from "@/types/location-summary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDayMenu } from "@/hooks/use-day-menu";
import { computeHallMatches, type HallMatch } from "@/lib/day-menu/match";
import { easternMinutes, easternToday } from "@/lib/day-menu/scoring";

type SortMode = "match" | "nearest";

function withMatch(loc: LocationSummary, matches: Map<string, HallMatch>): LocationSummary {
  const m = matches.get(loc.id);
  return {
    ...loc,
    matchScore: m?.score ?? null,
    matchMeal: m?.meal ?? null,
    matchReasons: m?.reasons ?? [],
    heroItem: m?.topItem ? { name: m.topItem.name, rating: m.topItem.rating } : null,
    children: (loc.children ?? []).map((c) => withMatch(c, matches)),
  };
}

function bestScore(loc: LocationSummary): number | null {
  const scores = [loc, ...(loc.children ?? [])]
    .map((v) => v.matchScore)
    .filter((s): s is number => s != null);
  return scores.length ? Math.max(...scores) : null;
}

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
  const {
    preferences,
    updatePreferences,
    loading: prefsLoading,
    needsTier1Onboarding,
  } = usePreferences();
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

  // Hall Match Score: personalized against today's menu (guests use local prefs).
  const { menu: todayMenu } = useDayMenu(easternToday());
  const matches = useMemo(
    () =>
      todayMenu && !prefsLoading
        ? computeHallMatches(todayMenu, preferences, easternMinutes())
        : new Map<string, HallMatch>(),
    [todayMenu, preferences, prefsLoading],
  );
  const hasMatches = matches.size > 0;
  const [sortMode, setSortMode] = useState<SortMode>("match");

  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const base = (q ? locations.filter((l) => l.name.toLowerCase().includes(q)) : locations).map((l) =>
      withMatch(l, matches),
    );
    if (sortMode !== "match" || !hasMatches) return base; // hook order: open first, then nearest
    // Best match: scored halls by score, then everything else in its existing order.
    return base
      .map((loc, i) => ({ loc, i, score: bestScore(loc) }))
      .sort((a, b) => {
        if (a.score != null && b.score != null) return b.score - a.score || a.i - b.i;
        if (a.score != null) return -1;
        if (b.score != null) return 1;
        return a.i - b.i;
      })
      .map(({ loc }) => loc);
  }, [locations, searchQuery, matches, hasMatches, sortMode]);

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
      const active = document.activeElement;
      if (drawer && active && drawer.contains(active)) return;
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
          {hasMatches && (
            <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <TabsList className="grid h-10 w-full grid-cols-2 rounded-full">
                <TabsTrigger value="match" className="rounded-full">Best match</TabsTrigger>
                <TabsTrigger value="nearest" className="rounded-full">
                  {userLocation ? "Nearest" : "Open now"}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
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
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No locations found.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );

  return (
    <div
      className="relative box-border flex w-full flex-col overflow-hidden md:flex-row"
      style={{
        paddingTop: HEADER_HEIGHT,
        // Full viewport minus the mobile tab bar (0 at md+).
        height: "calc(100dvh - var(--bottom-nav-h, 0px))",
      }}
    >
      <DietaryEssentialsSheet
        open={!prefsLoading && needsTier1Onboarding}
        onOpenChange={() => {}}
        dietaryFilters={preferences.dietary_filters}
        onSave={async (filters) => {
          await updatePreferences({
            dietary_filters: filters,
            onboarding_completed: true,
          });
        }}
      />
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
              <SearchField
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Search dining halls, cafes..."
              />
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
              fixed left-0 z-40 flex w-full max-w-full flex-col bg-background shadow-xl touch-pan-y
              ${mobileDrawerOpen ? "" : "pointer-events-none"}
              ${dragX > 0 ? "transition-none" : "transition-transform duration-300 ease-out"}
            `}
            style={{
              top: HEADER_HEIGHT,
              height: `calc(100dvh - ${HEADER_HEIGHT} - var(--bottom-nav-h, 0px))`,
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
                  <SearchField
                    ref={mobileSearchRef}
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    placeholder="Search dining halls, cafes…"
                    containerClassName="min-w-0"
                    role="searchbox"
                    autoComplete="off"
                    onFocus={clearBlurTimer}
                    onBlur={handleMobileSearchBlur}
                    onMouseDown={clearBlurTimer}
                  />
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
