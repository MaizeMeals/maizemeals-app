import { useMemo, useEffect } from "react"
import { FilterState, INITIAL_FILTERS } from "./types" // Adjust import path as needed
import { Database } from "@/types/supabase"

type Item = Database['public']['Tables']['items']['Row']

export function useMacroStats(items: Item[], setFilters: React.Dispatch<React.SetStateAction<FilterState>>) {
  // 1. Extract raw data
  const stats = useMemo(() => {
    return {
      calories: items.map(i => Number((i.macronutrients as any)?.["Calories"] || 0)),
      protein: items.map(i => Number((i.macronutrients as any)?.["Protein"] || 0)),
      carbs: items.map(i => Number((i.macronutrients as any)?.["Total Carbohydrate"] || 0)),
      fat: items.map(i => Number((i.macronutrients as any)?.["Total Fat"] || 0)),
    }
  }, [items])

  // 2. Calculate Maxes
  const maxes = useMemo(() => ({
    calories: Math.max(50, Math.ceil(Math.max(0, ...stats.calories) / 50) * 50),
    protein: Math.max(10, Math.ceil(Math.max(0, ...stats.protein) / 10) * 10),
    carbs: Math.max(10, Math.ceil(Math.max(0, ...stats.carbs) / 10) * 10),
    fat: Math.max(10, Math.ceil(Math.max(0, ...stats.fat) / 10) * 10),
  }), [stats])

  // 3. Auto-update filters when data loads
  useEffect(() => {
    if (items.length === 0) return

    setFilters((prev) => {
      const updateMax = (currentMax: number, initialMax: number, newMax: number) =>
        currentMax === initialMax ? newMax : currentMax

      const newCalMax = updateMax(prev.macros.calories[1], INITIAL_FILTERS.macros.calories[1], maxes.calories)
      const newProtMax = updateMax(prev.macros.protein[1], INITIAL_FILTERS.macros.protein[1], maxes.protein)
      const newCarbMax = updateMax(prev.macros.carbs[1], INITIAL_FILTERS.macros.carbs[1], maxes.carbs)
      const newFatMax = updateMax(prev.macros.fat[1], INITIAL_FILTERS.macros.fat[1], maxes.fat)

      // Bail out if nothing changed to prevent infinite loop
      if (
        newCalMax === prev.macros.calories[1] &&
        newProtMax === prev.macros.protein[1] &&
        newCarbMax === prev.macros.carbs[1] &&
        newFatMax === prev.macros.fat[1]
      ) {
        return prev
      }

      return {
        ...prev,
        macros: {
          calories: [prev.macros.calories[0], newCalMax] as [number, number],
          protein: [prev.macros.protein[0], newProtMax] as [number, number],
          carbs: [prev.macros.carbs[0], newCarbMax] as [number, number],
          fat: [prev.macros.fat[0], newFatMax] as [number, number]
        }
      }
    })
  }, [maxes, setFilters, items.length])

  return { stats, maxes }
}
