"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, SlidersHorizontal, Star, X, Check, RotateCcw, Flame, Dumbbell, Wheat } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as Dialog from "@radix-ui/react-dialog"
import { DualRangeSlider } from "@/components/ui/dual-slider"
import { MScaleIndicator } from "./MScaleIndicator"
import { getDietaryConfig } from "./DietaryTags"
import { Database } from "@/types/supabase"
import { MacroHistogram } from "./MacroHistogram"

import { filterItems } from "@/lib/filter-utils"

// Assuming Item type is available here, or import it
type Item = Database['public']['Tables']['items']['Row']

export type FilterState = {
  search: string
  dietary: string[]
  minRating: number
  minMScale: number
  macros: {
    calories: [number, number]
    protein: [number, number]
    carbs: [number, number]
    fat: [number, number]
  }
}

export const INITIAL_FILTERS: FilterState = {
  search: "",
  dietary: [],
  minRating: 0,
  minMScale: 1,
  macros: {
    calories: [0, 2000],
    protein: [0, 100],
    carbs: [0, 150],
    fat: [0, 100]
  }
}

const DIETARY_IDS = [
  "vegan", "vegetarian", "glutenfree", "halal", "kosher", "spicy", "highprotein", "highfiber"
]

interface DiningFiltersProps {
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  items: Item[]
}

export function DiningFilters({ filters, setFilters, items }: DiningFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters)
  const [activeCount, setActiveCount] = useState(0);

  // Extract macro data for histograms
  const allCalories = useMemo(() => items.map(i => {
      const m = i.macronutrients as Record<string, number>
      return Number(m?.["Calories"] || 0)
  }), [items])

  const allProtein = useMemo(() => items.map(i => {
      const m = i.macronutrients as Record<string, number>
      return Number(m?.["Protein"] || 0)
  }), [items])

  const allCarbs = useMemo(() => items.map(i => {
      const m = i.macronutrients as Record<string, number>
      return Number(m?.["Total Carbohydrate"] || 0)
  }), [items])

  // Calculate filtered count dynamically
  const resultCount = useMemo(() => {
    return filterItems(items, tempFilters).length
  }, [items, tempFilters])

  // Calculate dynamic maxes based on actual data
  const maxCalories = useMemo(() => Math.ceil(Math.max(...allCalories, 500) / 50) * 50, [allCalories])
  const maxProtein = useMemo(() => Math.ceil(Math.max(...allProtein, 50) / 10) * 10, [allProtein])
  const maxCarbs = useMemo(() => Math.ceil(Math.max(...allCarbs, 50) / 10) * 10, [allCarbs])

  // AUTOMATICALLY UPDATE FILTERS WHEN DATA LOADS
  useEffect(() => {
    if (items.length === 0) return

    setFilters((prev) => {
      // Logic: Only update the upper bound if the user hasn't changed it manually yet.
      // We check if the current upper bound matches the "Initial" default.

      const newCaloriesMax = prev.macros.calories[1] === INITIAL_FILTERS.macros.calories[1]
        ? maxCalories
        : prev.macros.calories[1]

      const newProteinMax = prev.macros.protein[1] === INITIAL_FILTERS.macros.protein[1]
        ? maxProtein
        : prev.macros.protein[1]

      const newCarbsMax = prev.macros.carbs[1] === INITIAL_FILTERS.macros.carbs[1]
        ? maxCarbs
        : prev.macros.carbs[1]

      return {
        ...prev,
        macros: {
          ...prev.macros,
          calories: [prev.macros.calories[0], newCaloriesMax] as [number, number],
          protein: [prev.macros.protein[0], newProteinMax] as [number, number],
          carbs: [prev.macros.carbs[0], newCarbsMax] as [number, number],
        }
      }
    })
  }, [maxCalories, maxProtein, maxCarbs, setFilters, items.length])

  // UPDATE ACTIVE FILTER COUNT
  useEffect(() => {
    let count = 0;

    if (filters.dietary.length > 0) count += filters.dietary.length;
    if (filters.search.length > 0) count++;
    if (filters.minMScale > 1) count++;
    if (filters.minRating > 0) count++;
    if (filters.macros.calories[0] > 0 || filters.macros.calories[1] < maxCalories) count++;
    if (filters.macros.protein[0] > 0 || filters.macros.protein[1] < maxProtein) count++;
    if (filters.macros.carbs[0] > 0 || filters.macros.carbs[1] < maxCarbs) count++;

    setActiveCount(count);
  }, [filters, maxCalories, maxProtein, maxCarbs])

  const handleOpen = () => {
    setTempFilters(filters)
    setIsOpen(true)
  }

  const applyFilters = () => {
    setFilters(tempFilters)
    setIsOpen(false)
  }

  const resetFilters = () => {
    const reset = {
      ...INITIAL_FILTERS,
      macros: {
        ...INITIAL_FILTERS.macros,
        calories: [0, maxCalories] as [number, number],
        protein: [0, maxProtein] as [number, number],
        carbs: [0, maxCarbs] as [number, number],
      },
      search: filters.search
    }
    setTempFilters(reset)
    setFilters(reset) // Apply immediately
  }

  const toggleDietary = (tag: string) => {
    const current = tempFilters.dietary
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag]
    setTempFilters({ ...tempFilters, dietary: next })
  }

  const toggleQuickDietary = (tag: string) => {
    const current = filters.dietary
    const next = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag]
    setFilters({ ...filters, dietary: next })
  }

  return (
    <div className="sticky top-16 z-20 bg-background border-b border-border pb-2 pt-2 transition-all">
      <div className="container mx-auto px-4 space-y-3">

        {/* Top Row: Search + Filter Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input
              type="text"
              placeholder="Search menu..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full h-10 pl-9 pr-4 bg-muted border border-transparent focus:border-muted-foreground rounded-full text-sm outline-none transition-all"
            />
            {filters.search && (
                <button
                    onClick={() => setFilters({...filters, search: ""})}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
          </div>

          <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Trigger asChild onClick={handleOpen}>
              <Button variant="outline" className={`h-10 rounded-full border-slate-200 dark:border-slate-800 px-4 gap-2 ${activeCount > 0 ? 'bg-maize/10 border-maize text-maize-dark' : ''}`}>
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden md:inline">Filters</span>
                {activeCount > 0 && (
                    <span className="bg-maize text-umich-blue text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ml-1">
                        {activeCount}
                    </span>
                )}
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full h-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:h-[85vh] sm:rounded-lg md:w-full">
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex flex-col space-y-1.5 text-center sm:text-left px-6 py-4 border-b border-border">
                    <Dialog.Title className="text-lg font-semibold leading-none tracking-tight flex justify-between items-center">
                        <span>Menu Filters</span>
                        <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </Dialog.Close>
                    </Dialog.Title>
                  </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8">
                {/* 1. Dietary */}
                <section>
                    <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Dietary Filters</h3>
                    <div className="flex flex-wrap gap-2">
                        {DIETARY_IDS.map(id => {
                            const config = getDietaryConfig(id)
                            if (!config) return null
                            const Icon = config.icon
                            const isSelected = tempFilters.dietary.includes(id)

                            return (
                            <button
                                key={id}
                                onClick={() => toggleDietary(id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                    isSelected
                                    ? `${config.bg} ${config.border} ${config.color}`
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${isSelected ? config.color : "text-muted-foreground"}`} />
                                {config.label}
                            </button>
                        )})}
                    </div>
                </section>

                {/* 2. Ratings */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider">Minimum Rating</h3>
                    <div className="flex gap-2">
                        {[0, 3, 4, 4.5].map(rating => (
                            <Button
                            key={rating}
                            variant="default"
                            onClick={() => setTempFilters({ ...tempFilters, minRating: rating })}
                            className={`flex-1 h-9 rounded-lg border text-sm font-medium shadow-none ${tempFilters.minRating === rating
                              ? "bg-maize border-maize text-umich-blue hover:bg-maize hover:text-umich-blue ring-umich-blue"
                              : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                                {rating === 0 ? "Any" : <>{rating}+ <Star className="w-3 h-3 fill-current" /></>}
                            </Button>
                        ))}
                    </div>
                </section>

                {/* 3. M-Scale */}
                <section>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground tracking-wider">Minimum Nutrition</h3>
                    <div className="flex items-end gap-4">
                      <MScaleIndicator score={tempFilters.minMScale} size="md" />
                        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-background shadow-sm">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-muted"
                                onClick={() => setTempFilters(p => ({...p, minMScale: Math.max(1, p.minMScale - 1)}))}
                                disabled={tempFilters.minMScale <= 1}
                            >
                                -
                            </Button>
                            <input
                                type="number"
                                className="w-8 text-center text-sm font-bold bg-transparent outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={tempFilters.minMScale}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0
                                    setTempFilters(p => ({...p, minMScale: val}))
                                }}
                                onBlur={(e) => {
                                    let val = parseInt(e.target.value) || 1
                                    val = Math.max(1, Math.min(6, val))
                                    setTempFilters(p => ({...p, minMScale: val}))
                                }}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-muted"
                                onClick={() => setTempFilters(p => ({...p, minMScale: Math.min(6, p.minMScale + 1)}))}
                                disabled={tempFilters.minMScale >= 5}
                            >
                                +
                            </Button>
                      </div>


                    </div>
                  </div>

                </section>

                {/* 4. Macros */}
                <section>
                    <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Macro Targets</h3>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between text-xs mb-2 px-1">
                                <span className="font-medium text-foreground flex items-center gap-1.5">
                                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                                    Calories
                                </span>
                                <span className="text-muted-foreground">{tempFilters.macros.calories[0]} - {tempFilters.macros.calories[1]}</span>
                            </div>
                            <div className="relative h-12 w-full group">
                                <div className="absolute inset-0 z-0">
                                    <MacroHistogram
                                        data={allCalories}
                                        min={0}
                                        max={maxCalories}
                                        color="fill-primary"
                                        selectedRange={tempFilters.macros.calories}
                                    />
                                </div>
                                <div className="absolute inset-0 z-10 top-1">
                                    <DualRangeSlider
                                        min={0} max={maxCalories} step={5}
                                        value={tempFilters.macros.calories}
                                        onValueChange={(val) => {
                                            let [min, max] = val;
                                            if (min < 20) min = 0;
                                            if (max > maxCalories - 20) max = maxCalories;
                                            setTempFilters({...tempFilters, macros: {...tempFilters.macros, calories: [min, max]}})
                                        }}
                                        minimal
                                        className="py-0"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-2 px-1">
                                <span className="font-medium text-foreground flex items-center gap-1.5">
                                    <Dumbbell className="w-3.5 h-3.5 text-rose-500" />
                                    Protein (g)
                                </span>
                                <span className="text-muted-foreground">{tempFilters.macros.protein[0]} - {tempFilters.macros.protein[1]}g</span>
                            </div>
                            <div className="relative h-12 w-full group">
                                <div className="absolute inset-0 z-0">
                                    <MacroHistogram
                                        data={allProtein}
                                        min={0}
                                        max={maxProtein}
                                        color="fill-primary"
                                        selectedRange={tempFilters.macros.protein}
                                    />
                                </div>
                                <div className="absolute inset-0 z-10 top-1">
                                    <DualRangeSlider
                                        min={0} max={maxProtein} step={1}
                                        value={tempFilters.macros.protein}
                                        onValueChange={(val) => {
                                            let [min, max] = val;
                                            if (min < 5) min = 0;
                                            if (max > maxProtein - 5) max = maxProtein;
                                            setTempFilters({...tempFilters, macros: {...tempFilters.macros, protein: [min, max]}})
                                        }}
                                        minimal
                                        className="py-0"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-2 px-1">
                                <span className="font-medium text-foreground flex items-center gap-1.5">
                                    <Wheat className="w-3.5 h-3.5 text-amber-500" />
                                    Carbs (g)
                                </span>
                                <span className="text-muted-foreground">{tempFilters.macros.carbs[0]} - {tempFilters.macros.carbs[1]}g</span>
                            </div>
                            <div className="relative h-12 w-full group">
                                <div className="absolute inset-0 z-0">
                                    <MacroHistogram
                                        data={allCarbs}
                                        min={0}
                                        max={maxCarbs}
                                        color="fill-primary"
                                        selectedRange={tempFilters.macros.carbs}
                                    />
                                </div>
                                <div className="absolute inset-0 z-10 top-1">
                                    <DualRangeSlider
                                        min={0} max={maxCarbs} step={1}
                                        value={tempFilters.macros.carbs}
                                        onValueChange={(val) => {
                                            let [min, max] = val;
                                            if (min < 2) min = 0;
                                            if (max > maxCarbs - 2) max = maxCarbs;
                                            setTempFilters({...tempFilters, macros: {...tempFilters.macros, carbs: [min, max]}})
                                        }}
                                        minimal
                                        className="py-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
              </div>

              <div className="p-4 bg-background border-t border-border mt-auto flex flex-row items-center justify-between gap-4 sm:justify-between">
                 <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
                    Reset
                 </Button>
                 <Button onClick={applyFilters} className="bg-maize text-umich-blue hover:bg-yellow-400 font-bold shadow-lg px-8">
                    Show {resultCount} items
                 </Button>
              </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {/* Quick Toggles (Wrapped) */}
        <div className="flex flex-wrap gap-2 pb-1">
            {DIETARY_IDS.map(id => {
                const config = getDietaryConfig(id)
                if (!config) return null
                const Icon = config.icon
                const isSelected = filters.dietary.includes(id)

                return (
                <button
                    key={id}
                    onClick={() => toggleQuickDietary(id)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                        isSelected
                        ? `${config.bg} ${config.border} ${config.color}`
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                >
                    <Icon className={`w-3 h-3 ${isSelected ? config.color : "text-muted-foreground"}`} />
                    {config.label}
                </button>
            )})}
        </div>
      </div>
    </div>
  )
}
