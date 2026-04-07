"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useLocationData } from "@/hooks/use-location-data"
import { LocationHero } from "@/components/locations/slug/LocationHero"
import { MenuTabs } from "@/components/locations/slug/MenuTabs"
import { StationGroup } from "@/components/locations/slug/StationGroup"
import { DetailDrawer, ItemDetailSidebar } from "@/components/locations/slug/DetailDrawer"
import { SocialProof } from "@/components/locations/slug/SocialProof"
import { ReviewItemPickerModal } from "@/components/locations/slug/ReviewItemPickerModal"
import { ReviewModal } from "@/components/locations/detail-panel/ReviewModal"
import { Utensils, Camera } from "lucide-react"
import type { Item, ItemWithPhotos, MenuData, StationGroup as StationGroupData } from "@/types/dining"
import { LocationSkeleton } from "@/components/locations/slug/LocationSkeleton"
import { StickyHeader } from "@/components/locations/slug/StickyHeader"
import { FilterState, INITIAL_FILTERS } from "@/components/locations/slug/filters/types"
import { filterItems } from "@/lib/filter-utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"

const STATION_HIGH_PRIORITY = ["24 carrots", "wild fire maize", "signature maize", "halal", "kosher"]
const STATION_LOW_PRIORITY = ["m-bakery", "mbakery", "pizziti", "soup"]

function sortStationGroups(filteredGroups: StationGroupData[]): StationGroupData[] {
  return [...filteredGroups].sort((a, b) => {
    const stationA = a.station.toLowerCase()
    const stationB = b.station.toLowerCase()
    const idxA_High = STATION_HIGH_PRIORITY.findIndex((p) => stationA.includes(p))
    const idxB_High = STATION_HIGH_PRIORITY.findIndex((p) => stationB.includes(p))
    if (idxA_High !== -1 && idxB_High !== -1) return idxA_High - idxB_High
    if (idxA_High !== -1) return -1
    if (idxB_High !== -1) return 1
    const idxA_Low = STATION_LOW_PRIORITY.findIndex((p) => stationA.includes(p))
    const idxB_Low = STATION_LOW_PRIORITY.findIndex((p) => stationB.includes(p))
    if (idxA_Low !== -1 && idxB_Low !== -1) return idxA_Low - idxB_Low
    if (idxA_Low !== -1) return 1
    if (idxB_Low !== -1) return -1
    return stationA.localeCompare(stationB)
  })
}

function findMealForItem(menu: MenuData, itemId: string): string | null {
  for (const meal of Object.keys(menu)) {
    if (menu[meal].some((g) => g.items.some((i) => i.id === itemId))) {
      return meal
    }
  }
  return null
}

export default function LocationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const itemParam = searchParams.get("item")
  const reviewParam = searchParams.get("review")

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  )

  const { data, loading, error, refetch } = useLocationData(slug, selectedDate)
  const [activeTab, setActiveTab] = useState<string>("Lunch")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [flashItemId, setFlashItemId] = useState<string | null>(null)
  const deepLinkConsumedRef = useRef<string | null>(null)
  const reviewDeepLinkConsumedRef = useRef<string | null>(null)

  // Review flow: FAB opens item picker → user picks item → ReviewModal. "I ate this" in drawer opens ReviewModal directly.
  const [reviewPickerOpen, setReviewPickerOpen] = useState(false)
  const [reviewItemFromPicker, setReviewItemFromPicker] = useState<Item | null>(null)
  const [reviewItemFromDrawer, setReviewItemFromDrawer] = useState<Item | null>(null)
  const reviewItem = reviewItemFromDrawer ?? reviewItemFromPicker
  const closeReviewModal = () => {
    setReviewItemFromDrawer(null)
    setReviewItemFromPicker(null)
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setFilters({
      ...INITIAL_FILTERS,
      dietary: filters.dietary
    })
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setFilters({
      ...INITIAL_FILTERS,
      dietary: filters.dietary // dont reset, its visible
    })
  }

  const currentStationGroups = data?.menu?.[activeTab] || []
  const allItems = useMemo(() => currentStationGroups.flatMap((g) => g.items), [currentStationGroups])

  const sortedGroups = useMemo(() => {
    if (!data?.menu) return []
    const groups = data.menu[activeTab] || []
    const filteredGroups = groups
      .map((group) => {
        const filteredItems = filterItems(group.items, filters)
        return { ...group, items: filteredItems }
      })
      .filter((group) => group.items.length > 0)
    return sortStationGroups(filteredGroups)
  }, [data?.menu, activeTab, filters])

  // All menu items across all meals (for review item picker), deduped by id
  const allMenuItems = useMemo(() => {
    if (!data?.menu) return []
    const seen = new Set<string>()
    return Object.values(data.menu)
      .flat()
      .flatMap((g) => g.items)
      .filter((it) => {
        if (seen.has(it.id)) return false
        seen.add(it.id)
        return true
      })
  }, [data?.menu])

  const detailDrawerItem = useMemo((): ItemWithPhotos | null => {
    if (!selectedItem) return null
    const meta = data?.itemMetadata?.[selectedItem.id]
    if (!meta) return selectedItem
    const photos = meta.photos.map((storage_path) => ({ storage_path }))
    return {
      ...selectedItem,
      avg_rating:
        (meta.avgRating ?? 0) > 0 ? meta.avgRating : selectedItem.avg_rating,
      photos: photos.length > 0 ? photos : undefined,
      review_count: meta.reviewCount,
    }
  }, [selectedItem, data?.itemMetadata])

  // Deep link: /locations/[slug]?item=<id> — switch meal tab, reset filters so the item can appear, then scroll + highlight
  useEffect(() => {
    if (!itemParam) {
      deepLinkConsumedRef.current = null
      return
    }
    if (!data?.menu) return
    const meal = findMealForItem(data.menu, itemParam)
    if (!meal) return
    setActiveTab(meal)
    setFilters((prev) => ({ ...INITIAL_FILTERS, dietary: prev.dietary }))
  }, [itemParam, data?.menu])

  useEffect(() => {
    if (!itemParam || !data?.menu) return
    const inView = sortedGroups.some((g) =>
      g.items.some((i: Item) => i.id === itemParam),
    )
    if (!inView) return
    if (deepLinkConsumedRef.current === itemParam) return

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`menu-item-${itemParam}`)
      if (!el) return
      deepLinkConsumedRef.current = itemParam
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      setFlashItemId(itemParam)
      window.setTimeout(() => setFlashItemId(null), 2200)
      router.replace(`/locations/${slug}`, { scroll: false })
    }, 120)

    return () => clearTimeout(timer)
  }, [itemParam, sortedGroups, data?.menu, slug, router])

  // After OAuth from review CTA: /locations/[slug]?review=<itemId> opens ReviewModal for that item
  useEffect(() => {
    if (!reviewParam) {
      reviewDeepLinkConsumedRef.current = null
      return
    }
    if (!data?.menu) return
    if (reviewDeepLinkConsumedRef.current === reviewParam) return

    let found: Item | null = null
    for (const groups of Object.values(data.menu)) {
      for (const group of groups) {
        const item = group.items.find((i) => i.id === reviewParam)
        if (item) {
          found = item
          break
        }
      }
      if (found) break
    }
    if (!found) return

    const meal = findMealForItem(data.menu, reviewParam)
    if (meal) setActiveTab(meal)
    setFilters((prev) => ({ ...INITIAL_FILTERS, dietary: prev.dietary }))
    setReviewItemFromPicker(found)
    reviewDeepLinkConsumedRef.current = reviewParam

    const timer = window.setTimeout(() => {
      router.replace(`/locations/${slug}`, { scroll: false })
    }, 0)

    return () => clearTimeout(timer)
  }, [reviewParam, data?.menu, slug, router])

  if (loading && !data) {
    return <LocationSkeleton />
  }

  if (error || !data || !data.hall) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground px-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2 text-foreground">Location Not Found</h2>
          <p className="mb-6">{error || "We couldn't load this dining hall."}</p>
          <Link
            href="/locations"
            className="text-maize hover:underline text-sm font-bold"
          >
            See all locations
          </Link>
        </div>
      </div>
    )
  }

  const { hall, status, menu, availableDates } = data
  const meals = Object.keys(menu)

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* 1. Hero */}
      <LocationHero
        name={hall.name}
        type={data.hall.type ?? "Dining Hall"}
        imageUrl={hall.image_url}
        address={hall.address}
        latitude={hall.latitude}
        longitude={hall.longitude}
        status={status}
      />

      <div className="lg:flex lg:w-full lg:items-start">
        <div className="min-w-0 flex-1 lg:min-w-0">
          {/* 2.5 Filters */}
          <StickyHeader
            filters={filters}
            setFilters={setFilters}
            items={allItems}
            selectedDate={selectedDate}
            availableDates={availableDates}
            onDateChange={handleDateChange}
            loading={loading}
          />

          {/* 3. Menu Tabs */}
          <MenuTabs
            meals={meals}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            hours={data?.hours}
          />

          {/* 4. Menu Content */}
          <main className="container mx-auto px-4 py-6 min-h-[500px]">
            {sortedGroups.length > 0 ? (
              sortedGroups.map((group) => (
                <StationGroup
                  key={activeTab + group.station}
                  station={group.station}
                  items={group.items}
                  highlightedItemId={flashItemId}
                  onItemClick={setSelectedItem}
                />
              ))
            ) : allItems.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>It seems like there isnt any menu for today</p>
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No menu items matching your filters.</p>
                <button
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="text-maize hover:underline text-sm mt-2 font-bold"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </main>
        </div>

        <aside
          className={cn(
            "hidden lg:sticky lg:top-16 lg:z-10 lg:shrink-0 lg:overflow-hidden lg:bg-background lg:transition-[width,min-width] lg:duration-300 lg:ease-out motion-reduce:lg:transition-none",
            detailDrawerItem
              ? "lg:flex lg:w-[min(420px,38vw)] lg:min-w-[280px] lg:border-l lg:border-border lg:shadow-md"
              : "lg:w-0 lg:min-w-0 lg:border-l lg:border-transparent",
          )}
          aria-hidden={!detailDrawerItem}
        >
          {detailDrawerItem ? (
            <div className="flex h-[calc(100vh-4rem)] min-h-[28rem] w-[min(420px,38vw)] min-w-[280px] flex-col">
              <ItemDetailSidebar
                item={detailDrawerItem}
                onClose={() => setSelectedItem(null)}
                onStartReview={setReviewItemFromDrawer}
              />
            </div>
          ) : null}
        </aside>
      </div>

      {/* 5. Social Proof */}
      <SocialProof />

      <ReviewItemPickerModal
        open={reviewPickerOpen}
        onOpenChange={setReviewPickerOpen}
        items={allMenuItems}
        onSelectItem={(item) => {
          setReviewItemFromPicker(item)
          setReviewPickerOpen(false)
        }}
      />

      {reviewItem && (
        <ReviewModal
          itemId={reviewItem.id}
          itemName={reviewItem.name}
          open={!!reviewItem}
          onOpenChange={(open) => !open && closeReviewModal()}
          onPosted={() => refetch()}
        />
      )}

      {/* Detail Drawer */}
      <DetailDrawer
        item={detailDrawerItem}
        isOpen={!!detailDrawerItem}
        onClose={() => setSelectedItem(null)}
        onStartReview={setReviewItemFromDrawer}
      />
    </div>
  )
}
