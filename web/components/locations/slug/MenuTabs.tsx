import { cn } from "@/lib/utils"
import { OperatingHour } from "@/types/dining"
import { formatTime } from "@/lib/dining-utils"

interface MenuTabsProps {
  meals: string[]
  activeTab: string
  onTabChange: (meal: string) => void
  hours?: OperatingHour[]
}

export function MenuTabs({ meals, activeTab, onTabChange, hours = [] }: MenuTabsProps) {
  if (meals.length === 0) return null

  const getTimeRange = (mealName: string) => {
    // Try precise match first, then loose match
    const shift = hours.find(h => h.event_name?.toLowerCase() === mealName.toLowerCase()) 
               || hours.find(h => h.event_name?.toLowerCase().includes(mealName.toLowerCase()))
    
    if (!shift) return null
    return `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`
  }

  return (
    <div className="bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800">
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
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
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
