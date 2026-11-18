"use client"

import { SearchField } from "@/components/ui/search-field"
import { FilterState } from "./filters/types"
import { Item } from "@/types/dining"
import { FilterDialog } from "./FilterDialog"
import { DateControls } from "./DateControls"
import { QuickToggles } from "./QuickToggles"
import { useMacroStats } from "./filters/useMacroStats"
import { useMemo } from "react"
import { filterItems } from "@/lib/filter-utils"

interface StickyHeaderProps {
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  items: Item[]
  selectedDate: string
  availableDates: string[]
  onDateChange: (date: string) => void
  loading?: boolean
}

export function StickyHeader({ filters, setFilters, items, selectedDate, availableDates, onDateChange, loading = false }: StickyHeaderProps) {
  // Custom hook handles the heavy math and auto-updates
  const { maxes } = useMacroStats(items, setFilters)

  const toggleQuickDietary = (tag: string) => {
    const current = filters.dietary
    const next = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag]
    setFilters({ ...filters, dietary: next })
  }

  const resultCount = useMemo(() => filterItems(items, filters).length, [items, filters])

  // Calculate active count
  const activeCount = useMemo(() => {
    let count = 0;

    if (filters.dietary.length > 0) count += filters.dietary.length;
    if (filters.search.length > 0) count++;
    if (filters.minMScale > 1) count++;
    if (filters.minRating > 0) count++;
    if (filters.macros.calories[0] > 0 || filters.macros.calories[1] < maxes.calories) count++;
    if (filters.macros.protein[0] > 0 || filters.macros.protein[1] < maxes.protein) count++;
    if (filters.macros.carbs[0] > 0 || filters.macros.carbs[1] < maxes.carbs) count++;
    if (filters.macros.fat[0] > 0 || filters.macros.fat[1] < maxes.fat) count++;

    return count;
  }, [filters, maxes])

  return (
    <div className="sticky top-16 z-20 bg-background border-b border-border pb-2 pt-2 transition-all">
      <div className="container mx-auto px-4 space-y-3">
        {/* Top Bar (Search + Date + Filters) */}
        <div className="flex gap-2">
           {/* Search Bar (Left/Center) */}
           <SearchField
             value={filters.search}
             onValueChange={(search) => setFilters({ ...filters, search })}
             placeholder="Search menu..."
           />

           {/* Date Picker (Desktop: DatePicker, Mobile: Dialog Trigger) */}
           <DateControls
             selectedDate={selectedDate}
             onDateChange={onDateChange}
             availableDates={availableDates}
             loading={loading}
           />

           {/* Filter Trigger */}
           <FilterDialog
             filters={filters}
             setFilters={setFilters}
             items={items}
             activeCount={activeCount}
             resultCount={resultCount}
           />
        </div>

        {/* Quick Toggles Row */}
        <QuickToggles selected={filters.dietary} onChange={toggleQuickDietary} />
      </div>
    </div>
  )
}
