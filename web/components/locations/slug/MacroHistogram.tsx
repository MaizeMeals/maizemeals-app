"use client"

import { useMemo } from "react"

interface MacroHistogramProps {
  data: number[]
  min: number
  max: number
  bins?: number
  height?: number
  color?: string
}

export function MacroHistogram({ 
  data, 
  min, 
  max, 
  bins = 30, 
  height = 40,
  color = "fill-slate-300 dark:fill-slate-700" 
}: MacroHistogramProps) {
  
  const pathData = useMemo(() => {
    if (data.length === 0) return ""

    const binSize = (max - min) / bins
    const counts = new Array(bins).fill(0)
    let maxCount = 0

    // Populate bins
    data.forEach(val => {
      if (val >= min && val <= max) {
        const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1)
        counts[binIndex]++
        if (counts[binIndex] > maxCount) maxCount = counts[binIndex]
      }
    })

    if (maxCount === 0) return ""

    // Generate SVG Path (Smooth curve)
    // We'll use a simple Catmull-Rom or just line segments for now, 
    // but to make it "smoothened", we can average neighbors or use a cubic bezier.
    // For simplicity and robustness, let's do a simple area chart with small bins, 
    // maybe apply a moving average smoothing.
    
    // Smooth counts (Moving Average)
    const smoothedCounts = counts.map((c, i) => {
        const prev = counts[i-1] || c
        const next = counts[i+1] || c
        return (prev + c + next) / 3
    })

    // Generate points
    const points = smoothedCounts.map((count, i) => {
      const x = (i / (bins - 1)) * 100
      const y = 100 - (count / maxCount) * 100
      return `${x},${y}`
    })

    return `M0,100 L${points.join(" L")} L100,100 Z`
  }, [data, min, max, bins])

  return (
    <div className="w-full h-10 mb-1 px-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            <path 
                d={pathData} 
                className={`${color} opacity-50`} 
                stroke="none"
            />
        </svg>
    </div>
  )
}
