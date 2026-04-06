"use client"

import Link from "next/link"
import { useCampusLocations } from "@/hooks/use-campus-locations" // NEW HOOK
import { DiningHallLocation } from "@/types/location" // NEW TYPE
import { DiningCard, DiningCardSkeleton } from "./DiningCard"
import { useAnalytics } from "@/hooks/use-analytics"

export function DiningHallGrid() {
  // 1. Fetch EVERYTHING (Polymorphic)
  const { locations, loading } = useCampusLocations()
  const { track } = useAnalytics()

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-between mb-6 px-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 md:[@media(min-height:800px)]:text-slate-300 2xl:text-muted-foreground transition-colors">
            <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" /> Live Status
            </h3>
            <span className="text-sm font-medium text-muted-foreground opacity-50">Loading...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
            <DiningCardSkeleton key={i} />
            ))}
        </div>
      </div>
    )
  }

  // 2. Filter & Sort

  const sortedHalls = locations
    // STRICT FILTER: Only show Dining Halls in this grid
    .filter((loc): loc is DiningHallLocation => loc.type === 'DINING_HALLS')
    .sort((a, b) => {
      // Logic A: Capacity Data Exists
      const aCap = a.capacity.label !== "No Data"
      const bCap = b.capacity.label !== "No Data"
      if (aCap !== bCap) return aCap ? -1 : 1

      // Logic B: Is Open
      const aOpen = a.status.isOpen
      const bOpen = b.status.isOpen
      if (aOpen !== bOpen) return aOpen ? -1 : 1

      // Logic C: Popularity Bias
      const popular = ["Bursley", "East Quad", "Mosher-Jordan", "South Quad"]
      const aPop = popular.some(p => a.name.includes(p))
      const bPop = popular.some(p => b.name.includes(p))
      if (aPop !== bPop) return aPop ? -1 : 1

      return 0
    }).slice(0, 3)
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex justify-between mb-6 px-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 md:[@media(min-height:800px)]:text-slate-300 2xl:text-muted-foreground transition-colors">
           <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live Status
        </h3>
        <Link
          href="/locations"
          className="text-sm font-medium hover:underline text-primary md:[@media(min-height:800px)]:text-secondary dark:md:[@media(min-height:800px)]:text-primary 2xl:text-primary transition-colors"
        >
          View All Locations →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sortedHalls.map(hall => (
          <DiningCard
            key={hall.id}
            hall={hall}
            onClick={() => track('card_click', { name: hall.name })}
            href={`/locations/${hall.slug}`}
          />
        ))}
      </div>
    </div>
  )
}
