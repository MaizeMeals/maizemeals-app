"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface SliderProps {
  min: number
  max: number
  step?: number
  value: number[]
  onValueChange: (value: number[]) => void
  className?: string
  formatLabel?: (value: number) => string
}

export function DualRangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  className,
  formatLabel
}: SliderProps) {
  return (
    <div className={cn("relative w-full py-4", className)}>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minStepsBetweenThumbs={1}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <SliderPrimitive.Range className="absolute h-full bg-maize" />
        </SliderPrimitive.Track>
        
        {value.map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            className="block h-5 w-5 rounded-full border-2 border-maize bg-white shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110"
          />
        ))}
      </SliderPrimitive.Root>

      {/* Labels */}
      {formatLabel && (
        <div className="absolute -bottom-2 w-full flex justify-between text-xs text-slate-500 font-medium font-mono">
            {value.length === 1 ? (
               // For single slider, maybe center label or put it near thumb? 
               // For simplicty, just show min/max labels of the range if provided?
               // The original code showed value[0] and value[1].
               // If single value, let's just show that value.
               <span className="w-full text-center">{formatLabel(value[0])}</span>
            ) : (
               <>
                <span>{formatLabel(value[0])}</span>
                <span>{formatLabel(value[value.length - 1])}</span>
               </>
            )}
        </div>
      )}
    </div>
  )
}
