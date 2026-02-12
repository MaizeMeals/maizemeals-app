import { WheatOff, Vegan, Carrot, Beef, Sprout } from "lucide-react"
import { FoodHalalIcon } from "@/components/icons/mdi-food-halal"
import { FoodKosherIcon } from "@/components/icons/mdi-food-kosher"
import { ChiliMildIcon } from "@/components/icons/mdi-chili-mild"

export const getDietaryConfig = (tag: string) => {
  const normalized = tag.toLowerCase().replace(/[^a-z]/g, '')

  switch (normalized) {
    case 'glutenfree':
      return { icon: WheatOff, color: 'text-blue-500', label: 'Gluten Free', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900' }
    case 'halal':
      return { icon: FoodHalalIcon, color: 'text-purple-500', label: 'Halal', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-100 dark:border-purple-900' }
    case 'kosher':
      return { icon: FoodKosherIcon, color: 'text-blue-600', label: 'Kosher', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900' }
    case 'spicy':
      return { icon: ChiliMildIcon, color: 'text-red-500', label: 'Spicy', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-100 dark:border-red-900' }
    case 'vegan':
      return { icon: Vegan, color: 'text-green-500', label: 'Vegan', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-100 dark:border-green-900' }
    case 'vegetarian':
      return { icon: Carrot, color: 'text-orange-500', label: 'Vegetarian', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-100 dark:border-orange-900' }
    case 'highprotein':
      return { icon: Beef, color: 'text-rose-600', label: 'High Protein', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-100 dark:border-rose-900' }
    case 'highfiber':
      return { icon: Sprout, color: 'text-emerald-600', label: 'High Fiber', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900' }
    default:
      return null
  }
}

export const DietaryTag = ({ tag }: { tag: string }) => {
  const config = getDietaryConfig(tag)
  if (!config) return null
  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded border ${config.bg} ${config.border}`}
      title={config.label}
    >
      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      <span className={`hidden md:inline text-[10px] font-bold ${config.color} uppercase tracking-wider`}>
        {config.label}
      </span>
    </div>
  )
}
