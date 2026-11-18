"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DIETARY_IDS } from "./DietaryTags"
import { DietaryFilterButton } from "./filters/DietaryFilterButton"

interface QuickTogglesProps {
  selected: string[]
  onChange: (tag: string) => void
}

export function QuickToggles({ selected, onChange }: QuickTogglesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [selected])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative group -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 flex items-center transition-opacity duration-200 ${showLeftArrow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => scroll('left')}
                aria-label="Scroll dietary filters left"
                className="ml-1 h-7 w-7 rounded-full border-border bg-background shadow-sm hover:bg-muted"
            >
                <ChevronLeft className="text-muted-foreground" />
            </Button>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 items-center"
        >
            {DIETARY_IDS.map(id => (
                <DietaryFilterButton
                    key={id}
                    id={id}
                    isSelected={selected.includes(id)}
                    onClick={() => onChange(id)}
                    variant="small"
                />
            ))}
        </div>

        <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 flex items-center justify-end transition-opacity duration-200 ${showRightArrow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => scroll('right')}
                aria-label="Scroll dietary filters right"
                className="mr-1 h-7 w-7 rounded-full border-border bg-background shadow-sm hover:bg-muted"
            >
                <ChevronRight className="text-muted-foreground" />
            </Button>
        </div>
    </div>
  )
}
