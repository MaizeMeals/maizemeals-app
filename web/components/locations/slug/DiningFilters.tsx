"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as Dialog from "@radix-ui/react-dialog"
import { filterItems } from "@/lib/filter-utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Imports from our new folders
import { useMacroStats } from "./filters/useMacroStats"
import { DietarySection } from "./filters/DietarySection"
import { RatingSection } from "./filters/RatingSection"
import { MScaleSection } from "./filters/MScaleSection"
import { MacroSection } from "./filters/MacroSection"
import { DIETARY_IDS } from "./DietaryTags"
import { FilterState, INITIAL_FILTERS } from "./filters/types"
import { DietaryFilterButton } from "./filters/DietaryFilterButton"

// Types
import { Item } from "@/types/dining"

interface DiningFiltersProps {
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  items: Item[]
}

export function DiningFilters({ filters, setFilters, items }: DiningFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters)

  // Custom hook handles the heavy math and auto-updates
  const { stats, maxes } = useMacroStats(items, setFilters)

  // Handlers
  const handleOpen = () => {
    setTempFilters(filters)
    setIsOpen(true)
  }

  const applyFilters = () => {
    setFilters(tempFilters)
    setIsOpen(false)
  }

  // Helper to update macros cleanly
  const updateMacro = (key: keyof typeof tempFilters.macros, val: number[]) => {
     setTempFilters(prev => ({
         ...prev,
         macros: { ...prev.macros, [key]: val as [number, number] }
     }))
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

  const resultCount = useMemo(() => filterItems(items, tempFilters).length, [items, tempFilters])

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

    return count;
  }, [filters, maxes])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 0)
      // Use 1px buffer to handle fractional pixel widths
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScroll()
    // Re-check on window resize in case the list width changes
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [filters.dietary]) // Re-run if dietary options change

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200 // Adjust scroll distance
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="sticky top-16 z-20 bg-background border-b border-border pb-2 pt-2 transition-all">
      <div className="container mx-auto px-4 space-y-3">
        {/* Top Bar (Search + Trigger) */}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 border-muted-foreground rounded-full"
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
              {/* NOTE: Added overflow-hidden to the Content container to enforce the flex layout */}
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full h-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:h-[85vh] sm:rounded-lg md:w-full overflow-hidden">

                 {/* Header (Flex Item 1: Fixed Height) */}
                 <div className="flex flex-col space-y-1.5 text-center sm:text-left px-6 py-4 border-b border-border shrink-0">
                   <Dialog.Title className="text-lg font-semibold leading-none tracking-tight flex justify-between items-center">
                       <span>Menu Filters</span>
                       <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                         <X className="h-4 w-4" />
                         <span className="sr-only">Close</span>
                       </Dialog.Close>
                   </Dialog.Title>
                 </div>

                 {/* Scroll Frame (Flex Item 2: Grows to fill space) */}
                 {/* Removed 'pb-24' since footer is no longer absolute */}
                 <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6 space-y-8">

                   <DietarySection
                       selected={tempFilters.dietary}
                       onChange={toggleDietary}
                   />

                   <RatingSection
                       minRating={tempFilters.minRating}
                       onChange={(r) => setTempFilters({...tempFilters, minRating: r})}
                   />

                   <MScaleSection
                       value={tempFilters.minMScale}
                       onChange={(v) => setTempFilters({...tempFilters, minMScale: v})}
                   />

                   <MacroSection
                       macros={tempFilters.macros}
                       stats={stats}
                       maxes={maxes}
                       onChange={updateMacro}
                   />

                 </div>

                 {/* Footer (Flex Item 3: Fixed Height at bottom) */}
                 {/* Removed 'absolute', 'bottom-0', 'bg-background', 'border-t' */}
                 <div className="p-4 shrink-0 z-20 flex flex-row items-center justify-between gap-4 mt-auto">
                      <Button variant="ghost" onClick={() => {
                          const reset = {
                              ...INITIAL_FILTERS,
                              macros: {
                                  ...INITIAL_FILTERS.macros,
                                  calories: [0, maxes.calories] as [number, number],
                                  protein: [0, maxes.protein] as [number, number],
                                  carbs: [0, maxes.carbs] as [number, number],
                              },
                              search: filters.search
                          }
                          setTempFilters(reset)
                          setFilters(reset)
                      }} className="text-muted-foreground hover:text-foreground">
                        Reset
                      </Button>
                     <Button onClick={applyFilters} className="bg-maize text-umich-blue hover:bg-yellow-400 font-bold shadow-lg px-8">Show {resultCount} items</Button>
                 </div>
               </Dialog.Content>
             </Dialog.Portal>
           </Dialog.Root>
        </div>

        {/* Quick Toggles Row */}
        <div className="relative group -mx-4 px-4 sm:mx-0 sm:px-0">
            {/* Left Gradient + Arrow */}
            <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 flex items-center transition-opacity duration-200 ${showLeftArrow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button
                    onClick={() => scroll('left')}
                    className="h-7 w-7 bg-background border border-border rounded-full shadow-sm flex items-center justify-center hover:bg-muted ml-1"
                >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>

            {/* Scrollable Container */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 items-center"
            >
                {DIETARY_IDS.map(id => (
                    <DietaryFilterButton
                        key={id}
                        id={id}
                        isSelected={filters.dietary.includes(id)}
                        onClick={() => toggleQuickDietary(id)}
                        variant="small"
                    />
                ))}
            </div>

            {/* Right Gradient + Arrow */}
            <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 flex items-center justify-end transition-opacity duration-200 ${showRightArrow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button
                    onClick={() => scroll('right')}
                    className="h-7 w-7 bg-background border border-border rounded-full shadow-sm flex items-center justify-center hover:bg-muted mr-1"
                >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}
