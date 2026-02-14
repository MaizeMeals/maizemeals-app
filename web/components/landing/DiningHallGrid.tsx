"use client"

import Link from "next/link"
import { useDiningStatus } from "@/hooks/use-dining-status"
import { DiningCard, DiningCardSkeleton } from "./DiningCard"
import { useAnalytics } from "@/hooks/use-analytics"

export function DiningHallGrid() {
  const { halls, loading } = useDiningStatus()
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

  const sortedHalls = [...halls].sort((a, b) => {
    // 1. Capacity Data Exists
    const aCap = a.capacity.label !== "No Data"
    const bCap = b.capacity.label !== "No Data"
    if (aCap !== bCap) return aCap ? -1 : 1

    // 2. Is Open
    const aOpen = a.status.label === "Open" || a.status.label === "Closing Soon"
    const bOpen = b.status.label === "Open" || b.status.label === "Closing Soon"
    if (aOpen !== bOpen) return aOpen ? -1 : 1

    // 3. Popularity Bias
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
          className="text-sm font-medium hover:underline text-umich-blue dark:text-maize md:[@media(min-height:800px)]:text-maize 2xl:text-umich-blue 2xl:dark:text-maize transition-colors"
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
