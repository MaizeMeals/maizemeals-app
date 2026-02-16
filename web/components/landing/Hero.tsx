"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { useAnalytics } from "@/hooks/use-analytics"

export function Hero() {
  const { track } = useAnalytics()

  const handleFindFoodClick = () => {
    track('hero_find_food_clicked', {
      section: 'hero',
      destination: '/menus'
    })
  }

  const handleBrowseHallsClick = () => {
    track('hero_browse_halls_clicked', {
      section: 'hero',
      destination: '/locations'
    })
  }

  return (
    <section className="relative flex flex-col md:block md:min-h-screen overflow-hidden">

        {/* Immersive Background */}
        <div className="absolute top-0 inset-x-0 h-[600px] md:h-full z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{ objectPosition: 'center 40%' }}
          >
            <source src="/videos/campus-drone.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-maize/20 dark:bg-umich-blue/30 blur-[100px] rounded-full -z-10 mix-blend-multiply dark:mix-blend-screen" />
        </div>


        {/* Hero Content (Title & Buttons) */}
        <div className="relative h-[600px] flex flex-col justify-center items-center text-center z-10 px-4 pt-16 md:absolute md:inset-0 md:h-full 2xl:pb-0">
        <div className="container mx-auto">
          <h1 className="font-serif text-5xl md:text-7xl text-white mb-6 drop-shadow-sm">
            Your <span className="italic">essential</span> guide <br/>
            to <span className="text-maize">eating</span> on campus.
          </h1>

            <p className="max-w-xl mx-auto text-lg md:text-xl text-slate-300 mb-10 leading-relaxed">
              The unofficial <span className="font-semibold text-maize">companion</span> for U-M dining. View real-time menus, track nutrition, and rate food items.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
              <Button asChild size="lg" className="w-full sm:w-auto bg-maize text-umich-blue hover:bg-maize/80 font-bold">
                <Link href="/menus" onClick={handleFindFoodClick} className="flex items-center gap-2">
                  <span className="w-4" />
                  Find Food Now
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-white/80 dark:bg-black/50 backdrop-blur-sm border-input transform-gpu">
                <Link href="/locations" onClick={handleBrowseHallsClick}>Browse Dining Halls</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
  )
}
