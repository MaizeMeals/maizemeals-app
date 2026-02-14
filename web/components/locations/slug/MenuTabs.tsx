import { cn } from "@/lib/utils"
import { OperatingHour } from "@/types/dining"
import { formatTime } from "@/lib/dining-utils"
import { useEffect, useMemo, useRef } from "react"

interface MenuTabsProps {
  meals: string[]
  activeTab: string
  onTabChange: (meal: string) => void
  hours?: OperatingHour[]
}

export function MenuTabs({ meals, activeTab, onTabChange, hours = [] }: MenuTabsProps) {
  const hasAutoSelected = useRef(false)

  const sortedMeals = useMemo(() => {
    const getStartMinutes = (mealName: string) => {
      const shift = hours.find(h => h.event_name?.toLowerCase() === mealName.toLowerCase())
                  || hours.find(h => h.event_name?.toLowerCase().includes(mealName.toLowerCase()))

      if (!shift) return 9999; // If no time found, push to the end

      const [h, m] = shift.start_time.split(':').map(Number)
      return h * 60 + m
    }

    // Create a copy and sort
    return [...meals].sort((a, b) => getStartMinutes(a) - getStartMinutes(b))
  }, [meals, hours])

  useEffect(() => {
    if (hasAutoSelected.current || sortedMeals.length === 0 || hours.length === 0) return

    const now = new Date()
    const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))

    let currentMinutes = estNow.getHours() * 60 + estNow.getMinutes();

    let bestMatch: string | null = null

    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    let minDiff = Infinity

    for (const meal of sortedMeals) {
      const shift = hours.find(h => h.event_name?.toLowerCase() === meal.toLowerCase()
                                || h.event_name?.toLowerCase().includes(meal.toLowerCase()))

      if (shift) {
        const start = parseTime(shift.start_time)
        const end = parseTime(shift.end_time)

        if (currentMinutes >= start && currentMinutes < end) {
          bestMatch = meal;
          break; // Found it, stop looking
        }

        let diff = Math.abs(start - currentMinutes)

        if (diff > 0 && diff < minDiff) {
          minDiff = diff;
          bestMatch = meal;
        }
      }
    }

    if (!bestMatch && sortedMeals.length > 0) {
        bestMatch = sortedMeals[0]
    }

    if (bestMatch && bestMatch !== activeTab) {
      onTabChange(bestMatch)
    }

    hasAutoSelected.current = true
  }, [sortedMeals, hours, onTabChange, activeTab])

  if (meals.length === 0) return null

  const getTimeRange = (mealName: string) => {
    // Try precise match first, then loose match
    const shift = hours.find(h => h.event_name?.toLowerCase() === mealName.toLowerCase())
               || hours.find(h => h.event_name?.toLowerCase().includes(mealName.toLowerCase()))

    if (!shift) return null
    return `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`
  }

  return (
    <div className="bg-background/95 border-b border-border">
      <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
         <div className="flex min-w-max">
            {sortedMeals.map(meal => {
              const timeRange = getTimeRange(meal)
              const isActive = activeTab === meal

              return (
              <button
                key={meal}
                onClick={() => onTabChange(meal)}
                className={cn(
                  "flex-1 min-w-[100px] py-3 text-sm font-semibold transition-colors relative flex flex-col items-center justify-center gap-0.5",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="capitalize leading-none">{meal}</span>
                {timeRange && (
                    <span className={cn(
                        "text-[10px] font-medium leading-none",
                        isActive ? "opacity-100" : "opacity-60"
                    )}>
                        {timeRange}
                    </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
                )}
              </button>
            )})}
         </div>
      </div>
    </div>
  )
}
