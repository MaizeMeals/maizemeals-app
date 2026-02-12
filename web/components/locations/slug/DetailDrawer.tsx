"use client"

import { Star, X, Camera, ChevronRight, MessageSquarePlus } from "lucide-react"
import { ItemWithPhotos } from "@/types/dining"
import { getMacroTags } from "@/lib/dining-utils"
import { MScaleIndicator } from "./MScaleIndicator"
import { CarbonFootprint } from "./CarbonFootprint"
import { DietaryTag } from "./DietaryTags"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetClose, SheetTitle } from "@/components/ui/sheet"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

interface FoodDetailDrawerProps {
  item: ItemWithPhotos | null
  isOpen: boolean
  onClose: (open: boolean) => void
}

export function DetailDrawer({ item, isOpen, onClose }: FoodDetailDrawerProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  if (!item) return null

  // --- Data Parsing ---
  const carbonTag = item.dietary_tags?.find(t => t.toLowerCase().startsWith('carbon'))
  const macroTags = getMacroTags(item)
  const otherTags = Array.from(new Set([
    ...(item.dietary_tags?.filter(t => !t.toLowerCase().startsWith('carbon')) || []),
    ...macroTags
  ]))

  // UPDATED: Macro Parsing based on your provided JSON structure
  const macros = typeof item.macronutrients === 'object' && item.macronutrients
    ? (item.macronutrients as Record<string, number>)
    : {}

  const calories = macros["Calories"] || 0
  const protein = macros["Protein"] || 0
  const carbs = macros["Total Carbohydrate"] || 0
  const fat = macros["Total Fat"] || 0
  const sugar = macros["Sugars"] || 0
  const fiber = macros["Dietary Fiber"] || 0
  const sodium = macros["Sodium"] || 0
  const satFat = macros["Saturated Fat"] || 0

  const images = item.photos?.length
    ? item.photos.map(p => p.storage_path)
    : ["/images/food-placeholder-1.jpg"]

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl overflow-hidden flex flex-col bg-white dark:bg-slate-950">
        <SheetTitle className="sr-only">{item.name} Details</SheetTitle>

        {/* --- 1. Image Carousel --- */}
        <div className="relative w-full h-64 shrink-0 bg-slate-100 dark:bg-slate-900">
          <div
            className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            onScroll={(e) => {
              const scrollLeft = e.currentTarget.scrollLeft
              const width = e.currentTarget.offsetWidth
              setActiveImageIndex(Math.round(scrollLeft / width))
            }}
          >
            {images.map((src, idx) => (
              <div key={idx} className="w-full h-full shrink-0 snap-center relative flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                 {/* Replace with <Image> when you have real URLs */}
                 <span className="text-xs">No Photo Available</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {images.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === activeImageIndex ? "bg-white w-4" : "bg-white/50"}`}
              />
            ))}
          </div>

          <SheetClose className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors">
            <X className="w-5 h-5" />
          </SheetClose>
        </div>

        {/* --- Scrollable Content Body --- */}
        <div className="flex-1 overflow-y-auto p-6">

          <div className="mb-6">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
                {item.name}
              </h2>
              <div className="shrink-0 relative z-20" onClick={(e) => e.stopPropagation()}>
                <MScaleIndicator score={item.nutrition_score} size="lg" showLabel />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {item.avg_rating ? (
                <>
                  <div className="flex items-center gap-1 bg-maize/20 px-2 py-1 rounded-md">
                    <Star className="w-4 h-4 fill-maize text-maize" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.avg_rating.toFixed(1)}</span>
                  </div>
                  <Link href={`/reviews?item_id=${item.id}`} className="text-sm text-blue-600 hover:underline">
                    See reviews
                  </Link>
                </>
              ) : (
                <Link href={`/review/new?item_id=${item.id}`}>
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-xs border-dashed border-slate-300 dark:border-slate-700">
                        <Star className="w-3.5 h-3.5 text-slate-400" />
                        Be the first to review
                    </Button>
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {carbonTag && (
                <CarbonFootprint level={carbonTag.toLowerCase().replace('carbon', '') as any} />
              )}
              {otherTags.map(tag => (
                <DietaryTag key={tag} tag={tag} />
              ))}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800 mb-6" />

          {/* --- Nutrition Facts Label --- */}
          <div className="border-2 border-slate-900 dark:border-slate-200 p-4 rounded-sm max-w-sm mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm">
            <h3 className="text-3xl font-black border-b-[10px] border-slate-900 dark:border-slate-200 pb-1 mb-1 leading-none">
              Nutrition Facts
            </h3>

            <div className="flex justify-between items-baseline border-b-4 border-slate-900 dark:border-slate-200 pb-2 mb-2">
              <span className="font-bold text-lg">Serving Size</span>
              <span className="font-bold text-lg">{item.serving_size || "1 portion"}</span>
            </div>

            <div className="flex justify-between items-baseline border-b-[4px] border-slate-900 dark:border-slate-200 pb-2 mb-2">
              <div>
                <div className="font-bold text-sm">Amount per serving</div>
                <div className="font-black text-4xl">Calories</div>
              </div>
              <div className="text-5xl font-black">{calories}</div>
            </div>

            <div className="space-y-0 text-sm">
              <div className="flex justify-end text-xs font-bold border-b border-slate-900 pb-1 mb-1">
                 % Daily Value*
              </div>

              <MacroRow label="Total Fat" amount={fat} unit="g" bold />
              <MacroRow label="Saturated Fat" amount={satFat} unit="g" indent />
              <MacroRow label="Sodium" amount={sodium} unit="mg" bold />
              <MacroRow label="Total Carbohydrate" amount={carbs} unit="g" bold />
              <MacroRow label="Dietary Fiber" amount={fiber} unit="g" indent />
              <MacroRow label="Total Sugars" amount={sugar} unit="g" indent />
              <MacroRow label="Protein" amount={protein} unit="g" bold largeBorder />
            </div>

             <div className="mt-2 text-[10px] leading-tight text-slate-500">
               * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
             </div>
          </div>

          <div className="mt-8 mb-20 text-center">
             <Link href={`/review/new?item_id=${item.id}`} className="inline-block w-full">
                <Button size="lg" className="w-full gap-2 bg-umich-blue hover:bg-umich-blue/90 text-white shadow-lg shadow-umich-blue/20">
                    <Camera className="w-5 h-5" />
                    I ate this (Review)
                </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MacroRow({ label, amount, unit, bold, indent, largeBorder }: { label: string, amount: any, unit: string, bold?: boolean, indent?: boolean, largeBorder?: boolean }) {
    return (
        <div className={`flex justify-between items-center py-1 ${largeBorder ? "border-b-[8px] border-slate-900 dark:border-slate-200" : "border-b border-slate-300 dark:border-slate-700"}`}>
            <span className={`${bold ? "font-bold" : ""} ${indent ? "pl-4" : ""}`}>
                {label} <span className="font-normal">{amount}{unit}</span>
            </span>
            {/* Note: We aren't calculating actual DV% here since we don't have the FDA table, so we leave the right side generic or empty for now unless you want to hardcode the math. */}
            <span className="font-bold"></span>
        </div>
    )
}
