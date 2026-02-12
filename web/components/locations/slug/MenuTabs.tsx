import { cn } from "@/lib/utils"

interface MenuTabsProps {
  meals: string[]
  activeTab: string
  onTabChange: (meal: string) => void
}

export function MenuTabs({ meals, activeTab, onTabChange }: MenuTabsProps) {
  if (meals.length === 0) return null

  return (
    <div className="bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4">
         <div className="flex">
            {meals.map(meal => (
              <button
                key={meal}
                onClick={() => onTabChange(meal)}
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition-colors relative capitalize",
                  activeTab === meal
                    ? "text-umich-blue dark:text-maize"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {meal}
                {activeTab === meal && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-umich-blue dark:bg-maize" />
                )}
              </button>
            ))}
         </div>
      </div>
    </div>
  )
}
