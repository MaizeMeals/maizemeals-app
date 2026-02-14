import { cn } from "@/lib/utils"
import { OperatingHour } from "@/types/dining"
import { formatTime } from "@/lib/dining-utils"
import { useEffect, useRef } from "react"

interface MenuTabsProps {
  meals: string[]
  activeTab: string
  onTabChange: (meal: string) => void
  hours?: OperatingHour[]
}

export function MenuTabs({ meals, activeTab, onTabChange, hours = [] }: MenuTabsProps) {
  const hasAutoSelected = useRef(false)

  // Auto-select tab based on current time
  useEffect(() => {
    if (hasAutoSelected.current || meals.length === 0 || hours.length === 0) return

    const now = new Date()
    const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
    const currentMinutes = estNow.getHours() * 60 + estNow.getMinutes()

    let bestMatch: string | null = null

    // 1. Try to find a currently active meal
    for (const meal of meals) {
       const shift = hours.find(h => h.event_name?.toLowerCase() === meal.toLowerCase()) 
                  || hours.find(h => h.event_name?.toLowerCase().includes(meal.toLowerCase()))
       
       if (shift) {
         const [sh, sm] = shift.start_time.split(':').map(Number)
         const [eh, em] = shift.end_time.split(':').map(Number)
         const start = sh * 60 + sm
         const end = eh * 60 + em
         
         if (currentMinutes >= start && currentMinutes < end) {
           bestMatch = meal
           break
         }
       }
    }

    // 2. If no active meal (e.g. between Lunch and Dinner), look for the NEXT starting meal
    if (!bestMatch) {
       let minDiff = Infinity
       for (const meal of meals) {
         const shift = hours.find(h => h.event_name?.toLowerCase() === meal.toLowerCase()) 
                    || hours.find(h => h.event_name?.toLowerCase().includes(meal.toLowerCase()))
         if (shift) {
            const [sh, sm] = shift.start_time.split(':').map(Number)
            const start = sh * 60 + sm
            const diff = start - currentMinutes
            
            // If it starts in the future and is closer than others
            if (diff > 0 && diff < minDiff) {
               minDiff = diff
               bestMatch = meal
            }
         }
       }
    }

    if (bestMatch && bestMatch !== activeTab) {
       onTabChange(bestMatch)
    }
    
    // Mark as attempted so we don't override user interaction later
    hasAutoSelected.current = true
  }, [meals, hours, onTabChange, activeTab])

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
            {meals.map(meal => {
              const timeRange = getTimeRange(meal)
              const isActive = activeTab === meal
              
              return (
              <button
                key={meal}
                onClick={() => onTabChange(meal)}
                className={cn(
                  "flex-1 min-w-[100px] py-3 text-sm font-semibold transition-colors relative flex flex-col items-center justify-center gap-0.5",
                  isActive
                    ? "text-umich-blue dark:text-maize"
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
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-umich-blue dark:bg-maize" />
                )}
              </button>
            )})}
         </div>
      </div>
    </div>
  )
}
