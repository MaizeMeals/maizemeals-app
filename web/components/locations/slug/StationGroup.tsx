"use client"

import { Item } from "@/types/dining"
import { FoodItemCard } from "./FoodItemCard"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface StationGroupProps {
  station: string
  items: Item[]
  onItemClick: (item: Item) => void
}

export function StationGroup({ station, items, onItemClick }: StationGroupProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <button 
         onClick={() => setIsOpen(!isOpen)}
         className="w-full flex items-center gap-2 text-lg font-extrabold text-foreground uppercase tracking-wider mb-3 px-1 hover:opacity-80 transition-opacity text-left"
       >
          {isOpen ? <ChevronDown className="w-5 h-5 text-maize" /> : <ChevronRight className="w-5 h-5 text-maize" />}
          {station}
          <span className="ml-auto text-xs font-normal text-muted-foreground normal-case tracking-normal">
            {items.length} items
          </span>
       </button>
       
       {isOpen && (
         <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm animate-in slide-in-from-top-2 duration-200">
            {items.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                onClick={() => onItemClick(item)}
              />
            ))}
         </div>
       )}
    </div>
  )
}