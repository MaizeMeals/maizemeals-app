"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, Star, X, Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { DualRangeSlider } from "@/components/ui/dual-slider"
import { MScaleIndicator } from "./MScaleIndicator"
import { getDietaryConfig } from "./DietaryTags"

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

const DIETARY_OPTIONS = [
  { id: "vegan", label: "Vegan", color: "text-green-600 bg-green-50 border-green-200" },
  { id: "vegetarian", label: "Vegetarian", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { id: "glutenfree", label: "Gluten Free", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "halal", label: "Halal", color: "text-purple-600 bg-purple-50 border-purple-200" },
  { id: "kosher", label: "Kosher", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { id: "spicy", label: "Spicy", color: "text-red-600 bg-red-50 border-red-200" },
  { id: "highprotein", label: "High Protein", color: "text-rose-600 bg-rose-50 border-rose-200" },
]

interface DiningFiltersProps {
  filters: FilterState
  setFilters: (f: FilterState) => void
}

export function DiningFilters({ filters, setFilters }: DiningFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters)

  const handleOpen = () => {
    setTempFilters(filters)
    setIsOpen(true)
  }

  const applyFilters = () => {
    setFilters(tempFilters)
    setIsOpen(false)
  }

  const resetFilters = () => {
    const reset = { ...INITIAL_FILTERS, search: filters.search } // Keep search term
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

  // Count active advanced filters (excluding search and dietary which are visible)
  const activeCount = 
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minMScale > 1 ? 1 : 0) +
    (filters.macros.calories[1] < 2000 ? 1 : 0) + 
    (filters.macros.protein[0] > 0 ? 1 : 0);

  return (
    <div className="sticky top-16 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 pb-2 pt-2 transition-all">
      <div className="container mx-auto px-4 space-y-3">
        
        {/* Top Row: Search + Filter Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search menu..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full h-10 pl-9 pr-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-maize rounded-full text-sm outline-none transition-all"
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
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild onClick={handleOpen}>
              <Button variant="outline" className={`h-10 rounded-full border-slate-200 dark:border-slate-800 px-4 gap-2 ${activeCount > 0 ? 'bg-maize/10 border-maize text-maize-dark' : ''}`}>
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden md:inline">Filters</span>
                {activeCount > 0 && (
                    <span className="bg-maize text-umich-blue text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ml-1">
                        {activeCount}
                    </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader className="text-left mb-6">
                <SheetTitle className="flex justify-between items-center">
                    <span>Menu Filters</span>
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-8 text-slate-500 gap-1">
                        <RotateCcw className="w-3 h-3" /> Reset
                    </Button>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-8 pb-20">
                {/* 1. Dietary */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider">Dietary Preferences</h3>
                    <div className="flex flex-wrap gap-2">
                        {DIETARY_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => toggleDietary(opt.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                    tempFilters.dietary.includes(opt.id) 
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" 
                                    : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2. Ratings */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider">Minimum Rating</h3>
                    <div className="flex gap-2">
                        {[0, 3, 4, 4.5].map(rating => (
                            <button
                                key={rating}
                                onClick={() => setTempFilters({...tempFilters, minRating: rating})}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 transition-all ${
                                    tempFilters.minRating === rating
                                    ? "bg-maize/20 border-maize text-umich-blue"
                                    : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500"
                                }`}
                            >
                                {rating === 0 ? "Any" : <>{rating}+ <Star className="w-3 h-3 fill-current" /></>}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 3. M-Scale */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider">Nutrition Scale (Min)</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <DualRangeSlider 
                                min={1} max={6} step={1}
                                value={[tempFilters.minMScale]}
                                onValueChange={(val) => setTempFilters({...tempFilters, minMScale: val[0]})}
                                formatLabel={(val) => `Level ${val}`}
                            />
                        </div>
                        <div className="shrink-0">
                            <MScaleIndicator score={tempFilters.minMScale} size="sm" />
                        </div>
                    </div>
                </section>

                {/* 4. Macros */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 uppercase tracking-wider">Macro Targets</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Calories</span>
                                <span className="text-slate-500">{tempFilters.macros.calories[0]} - {tempFilters.macros.calories[1]} kcal</span>
                            </div>
                            <DualRangeSlider 
                                min={0} max={2000} step={50}
                                value={tempFilters.macros.calories}
                                onValueChange={(val) => setTempFilters({...tempFilters, macros: {...tempFilters.macros, calories: val as [number, number]}})}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Protein (g)</span>
                                <span className="text-slate-500">{tempFilters.macros.protein[0]} - {tempFilters.macros.protein[1]}g</span>
                            </div>
                            <DualRangeSlider 
                                min={0} max={100} step={5}
                                value={tempFilters.macros.protein}
                                onValueChange={(val) => setTempFilters({...tempFilters, macros: {...tempFilters.macros, protein: val as [number, number]}})}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Carbs (g)</span>
                                <span className="text-slate-500">{tempFilters.macros.carbs[0]} - {tempFilters.macros.carbs[1]}g</span>
                            </div>
                            <DualRangeSlider 
                                min={0} max={150} step={5}
                                value={tempFilters.macros.carbs}
                                onValueChange={(val) => setTempFilters({...tempFilters, macros: {...tempFilters.macros, carbs: val as [number, number]}})}
                            />
                        </div>
                    </div>
                </section>
              </div>

              <SheetFooter className="absolute bottom-0 left-0 w-full p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                 <Button onClick={applyFilters} className="w-full bg-umich-blue hover:bg-umich-blue/90 text-white h-12 rounded-xl text-base font-bold shadow-lg">
                    Show Results
                 </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Quick Toggles (Wrapped) */}
        <div className="flex flex-wrap gap-2 pb-1">
            {DIETARY_OPTIONS.slice(0, 5).map(opt => {
                const config = getDietaryConfig(opt.id)
                const Icon = config?.icon || Check
                
                return (
                <button
                    key={opt.id}
                    onClick={() => toggleQuickDietary(opt.id)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                        filters.dietary.includes(opt.id)
                        ? opt.color
                        : "bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                    }`}
                >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                </button>
            )})}
        </div>
      </div>
    </div>
  )
}
