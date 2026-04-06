"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { ArrowLeft, X, Heart, Share2, ChevronRight, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { getLocationIcon, getTypeForDisplay } from "@/lib/dining";
import { getMainName, getVenuePickerLabel } from "@/lib/location-name-utils";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { LocationSummary } from "@/types/location-summary";

import { useLocationData } from "@/hooks/use-location-data";

import { Stars } from "./Stars";
import { OverviewTab } from "./OverviewTab";
import { ReviewsTab } from "./ReviewsTab";
import { AboutTab } from "./AboutTab";
import { MenuTab } from "./MenuTab";
import { PhotosDialog, getStoragePhotoUrl } from "./PhotosDialog";

interface Props {
  data: LocationSummary;
  /** When opening from map/list with a child venue selected (e.g. café), pass its id so the panel opens with that venue active. */
  initialVenueId?: string | null;
  /** Called when the user switches venue (parent vs child) so the map can highlight the correct sub-pin. */
  onActiveVenueChange?: (venueId: string) => void;
  onBack: () => void;
}

export function LocationDetailPanel({ data, initialVenueId, onActiveVenueChange, onBack }: Props) {
  const venues = [data, ...(data.children || [])];

  const [selectedVenueId, setSelectedVenueId] = useState<string>(() => {
    if (initialVenueId && venues.some((v) => v.id === initialVenueId)) return initialVenueId;
    return data.id;
  });
  const activeVenue = venues.find((v) => v.id === selectedVenueId) || data;
  /** Building / cluster name (parent), used when multiple venues share this location. */
  const clusterMainName = getMainName(data.name);
  const hasMultipleVenues = venues.length > 1;
  const activeVenuePickerLabel = getVenuePickerLabel(
    activeVenue.name,
    clusterMainName,
    activeVenue.type,
  );

  const [venuePickerOpen, setVenuePickerOpen] = useState(false);

  const onActiveVenueChangeRef = useRef(onActiveVenueChange);
  onActiveVenueChangeRef.current = onActiveVenueChange;

  // Notify parent when user switches venue (tabs) so the map can highlight the correct sub-pin.
  // Panel remounts when location or initialVenueId changes (key in parent), so no sync-from-props effect needed.
  useEffect(() => {
    onActiveVenueChangeRef.current?.(selectedVenueId);
  }, [selectedVenueId]);

  // Fetch real data for the active venue
  const {
    data: locationDetails,
    loading,
    error,
  } = useLocationData(activeVenue.slug);

  const rating = locationDetails?.rating ?? null;
  const reviewCount = locationDetails?.reviewCount ?? 0;
  const hasReviews = reviewCount > 0;

  const VenueTypeIcon = getLocationIcon(activeVenue.type);

  const reviewsSegment =
    loading ? (
      <span className="text-muted-foreground">Loading…</span>
    ) : hasReviews && rating != null ? (
      <>
        <span className="font-semibold text-foreground">{rating}</span>
        <Stars rating={rating} />
        <span className="text-muted-foreground">({reviewCount})</span>
      </>
    ) : (
      <span className="text-muted-foreground">No reviews yet</span>
    );

  const photoUrls = useMemo(() => {
    const hero = activeVenue.image_url
      ? `/images/dining_halls/${activeVenue.image_url}`
      : null;
    const fromReviews =
      locationDetails?.itemMetadata != null
        ? Object.values(locationDetails.itemMetadata).flatMap((m) => m.photos)
        : [];
    const reviewUrls = fromReviews.map(getStoragePhotoUrl).filter(Boolean);
    return hero ? [hero, ...reviewUrls] : reviewUrls;
  }, [activeVenue.image_url, locationDetails?.itemMetadata]);

  const hasHeroImage = Boolean(activeVenue.image_url);
  const hasGallery = photoUrls.length > 0;

  const heroBlock = (
    <div
      className={cn(
        "group relative h-56 w-full overflow-hidden bg-muted",
        hasGallery && "cursor-pointer",
      )}
    >
      {hasHeroImage ? (
        <>
          <Image
            src={`/images/dining_halls/${activeVenue.image_url}`}
            alt={activeVenue.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/40" />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
          <div
            className="absolute inset-0 bg-muted [background-image:radial-gradient(hsl(var(--foreground)/0.08)_1px,transparent_0)] [background-size:18px_18px]"
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-[0.35] [background-image:repeating-linear-gradient(135deg,hsl(var(--border))_0,hsl(var(--border))_1px,transparent_1px,transparent_11px)]"
            aria-hidden
          />
          <p className="relative z-[1] text-center text-sm font-medium text-muted-foreground">
            No image available
          </p>
        </div>
      )}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (navigator.share) {
              try {
                await navigator.share({
                  title: activeVenue.name,
                  text: `Check out ${activeVenue.name}`,
                  url: typeof window !== "undefined" ? window.location.href : "",
                });
              } catch (err) {
                console.error("Share failed", err);
              }
            }
          }}
          className={cn(
            "rounded-full border p-2.5 shadow-lg backdrop-blur-md transition-all active:scale-95",
            hasHeroImage
              ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
              : "border-border bg-background/90 text-foreground hover:bg-muted",
          )}
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={cn(
            "rounded-full border p-2.5 shadow-lg backdrop-blur-md transition-all active:scale-95",
            hasHeroImage
              ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
              : "border-border bg-background/90 text-foreground hover:bg-muted",
          )}
          aria-label="Save"
        >
          <Heart className="h-5 w-5" />
        </button>
      </div>
      {hasGallery && (
        <div
          className={cn(
            "absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-xs backdrop-blur-md transition-opacity",
            hasHeroImage
              ? "bg-black/60 text-white opacity-0 group-hover:opacity-100"
              : "border border-border bg-background/90 text-muted-foreground opacity-0 group-hover:opacity-100",
          )}
        >
          <ChevronRight className="h-3 w-3" />
          View all photos
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background animate-in slide-in-from-left-5 duration-300">
      {/* --- TOP NAV: back arrow (desktop) · close to map (mobile) --- */}
      <div className="flex items-center gap-3 p-4 border-b border-border/40 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hidden md:inline-flex rounded-full h-9 w-9 hover:bg-muted/80"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {hasMultipleVenues ? (
            <span className="truncate font-semibold text-lg leading-tight">
              {clusterMainName}
            </span>
          ) : (
            <h2 className="truncate font-semibold text-lg leading-none">
              {activeVenue.name}
            </h2>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden rounded-full h-9 w-9 hover:bg-muted/80"
          aria-label="Close and return to map"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* --- SCROLLABLE CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* 1. HERO IMAGE + Photos dialog (dialog only when there is at least one photo URL) */}
        {hasGallery ? (
          <PhotosDialog photoUrls={photoUrls} venueName={activeVenue.name}>
            {heroBlock}
          </PhotosDialog>
        ) : (
          heroBlock
        )}

        {/* 2. HEADER INFO */}
        <div className="px-5 pt-5 pb-2">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
            {hasMultipleVenues ? clusterMainName : activeVenue.name}
          </h1>

          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
            {hasMultipleVenues && (
              <>
                <Popover open={venuePickerOpen} onOpenChange={setVenuePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-8 max-w-[min(100%,260px)] shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 text-sm font-semibold text-foreground",
                        "hover:bg-muted/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        venuePickerOpen && "border-maize bg-maize/15",
                      )}
                      aria-expanded={venuePickerOpen}
                      aria-haspopup="dialog"
                      aria-label={`Venue: ${activeVenuePickerLabel}. Change venue.`}
                    >
                      <VenueTypeIcon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          venuePickerOpen ? "text-foreground" : "text-muted-foreground",
                        )}
                      />
                      <span className="min-w-0 truncate leading-none">
                        {activeVenuePickerLabel}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                          venuePickerOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    className="w-[min(100vw-2rem,22rem)] p-2"
                  >
                    <p className="px-2 pb-2 text-center text-xs font-medium text-muted-foreground">
                      Venues at this location
                    </p>
                    <ul className="space-y-1">
                      {venues.map((v) => {
                        const Icon = getLocationIcon(v.type);
                        const label = getVenuePickerLabel(
                          v.name,
                          clusterMainName,
                          v.type,
                        );
                        const isActive = v.id === selectedVenueId;
                        return (
                          <li key={v.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVenueId(v.id);
                                setVenuePickerOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-full border border-transparent px-2.5 py-2 text-left text-sm font-semibold transition-colors",
                                isActive
                                  ? "border-maize bg-maize/20 text-foreground shadow-sm"
                                  : "text-foreground hover:bg-muted",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  isActive ? "text-foreground" : "text-muted-foreground",
                                )}
                              />
                              <span className="min-w-0 flex-1">{label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground" aria-hidden>
                  ·
                </span>
              </>
            )}
            {!hasMultipleVenues && (
              <>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <VenueTypeIcon className="h-3.5 w-3.5 shrink-0" />
                  {getTypeForDisplay(activeVenue.type.replace("_", " "))}
                </span>
                <span className="text-muted-foreground" aria-hidden>
                  ·
                </span>
              </>
            )}
            {reviewsSegment}
          </div>
        </div>

        {/* 3. TABS */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="px-5 border-b border-border/40">
            <TabsList className="h-10 p-0 bg-transparent gap-6">
              <TabsTrigger
                value="overview"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent px-0 pb-2 shadow-none text-muted-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="menu"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent px-0 pb-2 shadow-none text-muted-foreground"
              >
                Menu
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent px-0 pb-2 shadow-none text-muted-foreground"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent px-0 pb-2 shadow-none text-muted-foreground"
              > 
                About
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="overview"
            className="p-0 animate-in fade-in-50 duration-300"
          >
            <OverviewTab activeVenue={activeVenue} loading={loading} weeklyHours={locationDetails?.weeklyHours} />
          </TabsContent>

          <TabsContent value="menu" className="p-0">
            <MenuTab
              loading={loading}
              menu={locationDetails?.menu}
              itemMetadata={locationDetails?.itemMetadata}
              venueSlug={activeVenue.slug}
            />
          </TabsContent>

          <TabsContent value="reviews" className="p-0">
            <ReviewsTab />
          </TabsContent>

          <TabsContent value="about" className="p-0">
            <AboutTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
