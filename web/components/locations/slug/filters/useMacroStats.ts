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
    }
  }, [items])

  // 2. Calculate Maxes
  const maxes = useMemo(() => ({
    calories: Math.ceil(Math.max(...stats.calories) / 50) * 50,
    protein: Math.ceil(Math.max(...stats.protein) / 10) * 10,
    carbs: Math.ceil(Math.max(...stats.carbs) / 10) * 10,
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

      // Bail out if nothing changed to prevent infinite loop
      if (
        newCalMax === prev.macros.calories[1] &&
        newProtMax === prev.macros.protein[1] &&
        newCarbMax === prev.macros.carbs[1]
      ) {
        return prev
      }

      return {
        ...prev,
        macros: {
          calories: [prev.macros.calories[0], newCalMax] as [number, number],
          protein: [prev.macros.protein[0], newProtMax] as [number, number],
          carbs: [prev.macros.carbs[0], newCarbMax] as [number, number],
          fat: prev.macros.fat // Preserved
        }
      }
    })
  }, [maxes, setFilters, items.length])

  return { stats, maxes }
}
