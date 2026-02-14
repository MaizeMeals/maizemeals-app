"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface DualRangeSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  minimal?: boolean
  color?: string
}

export function DualRangeSlider({
  className,
  minimal = false,
  color = "bg-primary",
  ...props
}: DualRangeSliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative w-full grow overflow-hidden rounded-full",
          minimal ? "h-full bg-transparent" : "h-2 bg-slate-200 dark:bg-slate-800"
        )}
      >
        {minimal ? (
          <>
            <div className="absolute h-[1px] w-full bg-slate-200 dark:bg-slate-800 top-1/2 -translate-y-1/2" />
            <SliderPrimitive.Range className={cn("absolute h-[1px] top-1/2 -translate-y-1/2", color)} />
          </>
        ) : (
          <SliderPrimitive.Range className={cn("absolute h-full", color)} />
        )}
      </SliderPrimitive.Track>

      {props.value?.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block h-6 w-6 rounded-full border border-slate-200 bg-white shadow-md ring-offset-background transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 cursor-grab active:cursor-grabbing active:scale-95"
        />
      ))}
    </SliderPrimitive.Root>
  )
}
