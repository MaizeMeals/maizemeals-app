"use client"

import { useRef, useState, type PointerEvent } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { logFoodItem } from "@/app/actions/macro-tracker"
import { LogFoodDialog } from "@/components/nutrition/LogFoodDialog"
import type { Item } from "@/types/dining"
import { getDynamicTags } from "@/lib/filter-utils"
import { Stars } from "@/components/locations/detail-panel/Stars"
import { MScaleIndicator } from "./MScaleIndicator"
import { CarbonFootprint } from "./CarbonFootprint"
import { DietaryTag } from "./DietaryTags"
import { cn } from "@/lib/utils"
import {
  dateInEasternTime,
  macroSummaryFromNutrition,
  menuMealToFoodLogMeal,
  roundMacro,
} from "@/lib/nutrition"
import { toast } from "@/lib/toast"
import { useAnalytics } from "@/hooks/use-analytics"

interface FoodItemCardProps {
  item: Item
  onClick?: () => void
  /** Brief highlight after deep-link scroll (e.g. `?item=id`). */
  highlight?: boolean
  mealType?: string
}

export function FoodItemCard({ item, onClick, highlight, mealType }: FoodItemCardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { track } = useAnalytics()
  const [quickLogging, setQuickLogging] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)
  const defaultMeal = menuMealToFoodLogMeal(mealType)
  const macros = macroSummaryFromNutrition(item.macronutrients)
  const hasNutrition = Object.values(macros).some((value) => value > 0)
  const carbonTag = item.dietary_tags?.find(t => t.toLowerCase().startsWith("carbon"))
  const dynamicTags = getDynamicTags(item)
  const otherTags = Array.from(new Set([
    ...(item.dietary_tags?.filter(t => !t.toLowerCase().startsWith("carbon")) || []),
    ...dynamicTags,
  ]))

  const clearPressTimer = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  const quickAdd = async () => {
    if (quickLogging || !hasNutrition || item.item_type === "station_header") return
    setQuickLogging(true)
    const result = await logFoodItem({
      itemId: item.id,
      servings: 1,
      meal: defaultMeal,
      consumedOn: dateInEasternTime(),
    })
    setQuickLogging(false)

    if (!result.success) {
      if (result.status === 401) {
        const next = pathname ? `${pathname}?item=${encodeURIComponent(item.id)}` : "/nutrition"
        router.push(`/login?next=${encodeURIComponent(next)}`)
        return
      }
      if (result.status === 428) {
        const returnTo = pathname ? `${pathname}?item=${encodeURIComponent(item.id)}` : "/locations"
        toast.info(result.error)
        router.push(`/nutrition?return_to=${encodeURIComponent(returnTo)}`)
        return
      }
      toast.error(result.error)
      return
    }

    track("food_quick_logged", {
      item_id: item.id,
      meal: defaultMeal,
      calories: macros.calories,
    })
    toast.success(`Added +${roundMacro(macros.calories)} Calories to Daily Log.`)
  }

  const startLongPress = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return
    clearPressTimer()
    longPressTriggered.current = false
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30)
      void quickAdd()
    }, 650)
  }

  return (
    <div
      id={`menu-item-${item.id}`}
      onPointerDown={startLongPress}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onContextMenu={(event) => {
        if (longPressTriggered.current) event.preventDefault()
      }}
      onClick={(event) => {
        if (longPressTriggered.current) {
          event.preventDefault()
          event.stopPropagation()
          longPressTriggered.current = false
          return
        }
        onClick?.()
      }}
      className={cn(
        "flex cursor-pointer select-none items-start justify-between border-b border-border bg-card p-4 transition-colors last:border-0 active:bg-accent",
        highlight && "ring-2 ring-inset ring-maize bg-maize/10",
      )}
    >
      <div className="flex-1 pr-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h4 className="text-base font-bold leading-tight text-foreground">{item.name}</h4>
        </div>

        <div className="mb-2 flex items-center gap-3 text-sm">
          {item.avg_rating ? (
            <div className="flex items-center gap-2">
              <Stars rating={item.avg_rating} />
              <span className="font-semibold tabular-nums text-foreground">
                {item.avg_rating.toFixed(1)}
                {(item.review_count ?? 0) > 0 ? (
                  <span className="font-normal text-muted-foreground"> ({item.review_count})</span>
                ) : null}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No ratings</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {carbonTag ? (
            <CarbonFootprint level={carbonTag.toLowerCase().replace("carbon", "") as any} />
          ) : null}
          {otherTags.map(tag => <DietaryTag key={tag} tag={tag} />)}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <MScaleIndicator score={item.nutrition_score} />
        <LogFoodDialog
          item={item}
          defaultMeal={defaultMeal}
          trigger={(
            <button
              type="button"
              disabled={!hasNutrition || item.item_type === "station_header" || quickLogging}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-maize/60 bg-maize text-blue shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Add ${item.name} to Daily Log`}
              title="Add to Daily Log (or hold the card to quick add)"
            >
              {quickLogging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          )}
        />
      </div>
    </div>
  )
}
