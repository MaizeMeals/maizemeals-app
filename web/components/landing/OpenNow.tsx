"use client"

import Link from "next/link"
import { useCampusLocations } from "@/hooks/use-campus-locations"
import { shortHallName } from "@/lib/schedule-notice"
import { Skeleton } from "@/components/ui/skeleton"
import type { CampusLocation } from "@/types/location"

const POPULAR = ["South Quad", "Mosher-Jordan", "East Quad", "Bursley", "Markley", "North Quad"]

function photo(loc: CampusLocation): string {
  return loc.image_url ? `/images/dining_halls/${loc.image_url}` : "/images/dining_halls/default.jpg"
}

/** Dining halls open right now (cafés if no hall is open), with their photos. */
export function OpenNow() {
  const { locations, loading } = useCampusLocations()

  const open = locations.filter((l) => l.status.isOpen)
  const halls = open.filter((l) => l.type === "DINING_HALLS")
  const shown = (halls.length > 0 ? halls : open)
    .slice()
    .sort((a, b) => {
      const pa = POPULAR.findIndex((p) => a.name.includes(p))
      const pb = POPULAR.findIndex((p) => b.name.includes(p))
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    })
    .slice(0, 4)

  if (!loading && shown.length === 0) return null

  return (
    <section aria-labelledby="open-now-heading" className="mx-auto max-w-6xl px-4 pt-10 md:pt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="open-now-heading" className="font-heading text-2xl font-bold text-umich-blue dark:text-white md:text-3xl">
          Open now
        </h2>
        <span className="flex gap-4">
          <Link href="/hours" className="text-sm font-semibold text-umich-blue hover:underline dark:text-maize">
            All hours
          </Link>
          <Link href="/locations" className="text-sm font-semibold text-umich-blue hover:underline dark:text-maize">
            All locations
          </Link>
        </span>
      </div>
      <ul className="mt-4 grid gap-2.5 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-[72px] rounded-2xl md:h-56" />
              </li>
            ))
          : shown.map((loc) => (
              <li key={loc.id}>
                <Link
                  href={`/locations/${loc.slug}`}
                  className="flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2 transition-shadow hover:shadow-md md:flex-col md:items-stretch md:gap-0 md:p-0"
                >
                  {/* Static files from public/: plain img keeps the layout simple. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo(loc)}
                    alt=""
                    loading="lazy"
                    className={
                      /logo/i.test(loc.image_url ?? "")
                        ? "h-14 w-[72px] shrink-0 rounded-xl bg-white object-contain p-1.5 md:h-36 md:w-full md:rounded-none md:p-6"
                        : "h-14 w-[72px] shrink-0 rounded-xl object-cover md:h-36 md:w-full md:rounded-none"
                    }
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/images/dining_halls/default.jpg"
                    }}
                  />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2 md:p-4">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{shortHallName(loc.name)}</span>
                      <span className="block truncate text-sm text-muted-foreground">{loc.status.details || loc.status.label}</span>
                    </span>
                    <span className="mr-1 shrink-0 rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-900 dark:bg-green-500/20 dark:text-green-200 md:mr-0">
                      Open
                    </span>
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  )
}
