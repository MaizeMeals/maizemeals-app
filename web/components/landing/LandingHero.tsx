"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useAnalytics } from "@/hooks/use-analytics"
import { cn } from "@/lib/utils"

const PLACEHOLDER = "Try “burger” or “tempeh”"

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function easternHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }).format(new Date()),
  ) % 24
}

function SearchBox({ variant }: { variant: "hero" | "app" }) {
  const router = useRouter()
  const { track } = useAnalytics()
  const [q, setQ] = useState("")

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    track("landing_search", { query: query.toLowerCase(), variant })
    router.push(query ? `/menus?q=${encodeURIComponent(query)}` : "/menus")
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn(
        "flex w-full items-center gap-2",
        variant === "hero"
          ? "max-w-2xl rounded-2xl bg-white p-2 shadow-2xl shadow-black/25"
          : "rounded-xl bg-muted px-3",
      )}
    >
      <label htmlFor={`landing-search-${variant}`} className="sr-only">
        Search today&apos;s menus
      </label>
      <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", variant === "hero" && "px-3")}>
        <Search className={cn("h-5 w-5 shrink-0", variant === "hero" ? "text-slate-500" : "text-muted-foreground")} aria-hidden />
        <input
          id={`landing-search-${variant}`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={PLACEHOLDER}
          enterKeyHint="search"
          className={cn(
            "min-w-0 flex-1 bg-transparent py-3 text-base outline-none",
            variant === "hero" ? "text-slate-900 placeholder:text-slate-500 md:text-lg" : "text-foreground placeholder:text-muted-foreground",
          )}
        />
      </div>
      {variant === "hero" ? (
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-xl bg-umich-blue px-5 text-base font-bold text-white transition-colors hover:bg-umich-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maize"
        >
          Search
        </button>
      ) : null}
    </form>
  )
}

/**
 * Two heroes, picked by CSS so there's no flash: the campus video for the
 * website, and a compact greeting + search when opened as the installed app
 * (display-mode: standalone), which goes straight to the food.
 */
export function LandingHero({ firstName }: { firstName: string | null }) {
  const greeting = firstName ? `${greetingFor(easternHour())}, ${firstName}` : null

  return (
    <>
      <section
        id="landing-hero"
        className="relative overflow-hidden text-white [@media(display-mode:standalone)]:hidden"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/videos/campus-drone-poster.webp"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 40%" }}
          aria-hidden
        >
          <source src="/videos/campus-drone.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/45" />

        <div
          className={cn(
            "relative mx-auto flex max-w-4xl flex-col items-center px-4 text-center",
            firstName ? "gap-4 pb-12 pt-28 md:pb-16 md:pt-36" : "gap-5 pb-12 pt-28 md:min-h-[640px] md:justify-center md:pb-20 md:pt-32",
          )}
        >
          {greeting ? <p className="text-base text-white/85 md:text-lg">{greeting}</p> : null}
          <h1 className="font-serif text-5xl leading-[1.02] drop-shadow-sm md:text-7xl">
            What are you <em className="text-maize">craving</em>?
          </h1>
          {!firstName ? (
            <p className="max-w-xl text-base leading-relaxed text-white/85 md:text-xl">
              Every U-M dining hall and café menu, with ingredients, nutrition and student ratings.
            </p>
          ) : null}
          <div className="mt-2 flex w-full justify-center">
            <SearchBox variant="hero" />
          </div>
          {!firstName ? (
            <Link href="/locations" className="text-sm font-medium text-white/90 underline-offset-4 hover:underline md:text-base">
              or browse all locations
            </Link>
          ) : null}
        </div>
      </section>

      <section className="hidden px-4 pb-1 pt-20 [@media(display-mode:standalone)]:block">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <h1 className="font-serif text-4xl leading-tight text-umich-blue dark:text-white">
            {greeting ?? (
              <>
                What are you <em>craving</em>?
              </>
            )}
          </h1>
          <SearchBox variant="app" />
        </div>
      </section>
    </>
  )
}
