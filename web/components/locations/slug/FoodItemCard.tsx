"use client"

import { useRef, useState, type PointerEvent } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { logFoodItem } from "@/app/actions/macro-tracker"
import { LogFoodDialog } from "@/components/nutrition/LogFoodDialog"
import type { Item } from "@/types/dining"
import { cn } from "@/lib/utils"
import {
  dateInEasternTime,
  macroSummaryFromNutrition,
  menuMealToFoodLogMeal,
  roundMacro,
} from "@/lib/nutrition"
import { toast } from "@/lib/toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { parseIngredientFlags } from "@/lib/ingredients"
import { ItemSummary } from "@/components/menus/ItemSummary"

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
        "flex cursor-pointer select-none items-start border-b border-border bg-card p-4 transition-colors last:border-0 active:bg-accent",
        highlight && "ring-2 ring-inset ring-maize bg-maize/10",
      )}
    >
      <ItemSummary
        item={item}
        additives={parseIngredientFlags(item.ingredient_flags, item.ingredients)?.categories}
        className="w-full"
        aside={(
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
        )}
      />
    </div>
  )
}
