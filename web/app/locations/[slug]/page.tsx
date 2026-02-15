"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useLocationData } from "@/hooks/use-location-data"
import { LocationHero } from "@/components/locations/slug/LocationHero"
import { MenuTabs } from "@/components/locations/slug/MenuTabs"
import { StationGroup } from "@/components/locations/slug/StationGroup"
import { DetailDrawer } from "@/components/locations/slug/DetailDrawer"
import { SocialProof } from "@/components/locations/slug/SocialProof"
import { Utensils, Camera } from "lucide-react"
import { Item } from "@/types/dining"
import { LocationSkeleton } from "@/components/locations/slug/LocationSkeleton"
import { StickyHeader } from "@/components/locations/slug/StickyHeader"
import { FilterState, INITIAL_FILTERS } from "@/components/locations/slug/filters/types"
import { filterItems } from "@/lib/filter-utils"
import { useParams } from "next/navigation"

export default function LocationPage() {
  const params = useParams()
  const slug = params.slug as string

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  )

  const { data, loading, error } = useLocationData(slug, selectedDate)
  const [activeTab, setActiveTab] = useState<string>("Lunch")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)

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
  const allItems = useMemo(() => currentStationGroups.flatMap(g => g.items), [currentStationGroups])

  if (loading && !data) {
    return <LocationSkeleton />
  }

  if (error || !data || !data.hall) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="text-center">
           <h2 className="text-xl font-bold mb-2">Location Not Found</h2>
           <p>{error || "We couldn't load this dining hall."}</p>
        </div>
      </div>
    )
  }

  const { hall, status, menu, availableDates } = data
  const meals = Object.keys(menu)
  // currentStationGroups and allItems are already defined above

  // --- Filtering Logic ---
  const filteredGroups = currentStationGroups.map(group => {
    const filteredItems = filterItems(group.items, filters)
    return { ...group, items: filteredItems }
  }).filter(group => group.items.length > 0)

  // Custom Station Sorting Logic
  const highPriority = ["24 carrots", "wild fire maize", "signature maize", "halal", "kosher"]
  const lowPriority = ["m-bakery", "mbakery", "pizziti", "soup"]

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const stationA = a.station.toLowerCase()
    const stationB = b.station.toLowerCase()

    // Check priorities
    const idxA_High = highPriority.findIndex(p => stationA.includes(p))
    const idxB_High = highPriority.findIndex(p => stationB.includes(p))

    // Both in high priority: sort by their order in the priority list
    if (idxA_High !== -1 && idxB_High !== -1) return idxA_High - idxB_High
    // Only A is high
    if (idxA_High !== -1) return -1
    // Only B is high
    if (idxB_High !== -1) return 1

    const idxA_Low = lowPriority.findIndex(p => stationA.includes(p))
    const idxB_Low = lowPriority.findIndex(p => stationB.includes(p))

    // Both in low priority: sort by their order in the priority list
    if (idxA_Low !== -1 && idxB_Low !== -1) return idxA_Low - idxB_Low
    // Only A is low (move to bottom)
    if (idxA_Low !== -1) return 1
    // Only B is low (move to bottom)
    if (idxB_Low !== -1) return -1

    // Default: Alphabetical for the rest
    return stationA.localeCompare(stationB)
  })

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* 1. Hero */}
      <LocationHero
        name={hall.name}
        imageUrl={hall.image_url}
        address={hall.address}
        latitude={hall.latitude}
        longitude={hall.longitude}
        status={status}
      />

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

      {/* 5. Social Proof */}
      <SocialProof />

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        <button className="bg-maize text-primary p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border-2 border-secondary">
           <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  )
}
