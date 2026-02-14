"use client"

import { useMemo } from "react"

interface MacroHistogramProps {
  data: number[]
  min: number
  max: number
  bins?: number
  height?: number
  color?: string
  selectedRange?: [number, number]
}

export function MacroHistogram({ 
  data, 
  min, 
  max, 
  bins = 30, 
  height = 40,
  color = "fill-muted",
  selectedRange
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
    
    // Generate Bars
    return counts.map((count, i) => {
      const x = (i / bins) * 100
      const width = (1 / bins) * 100
      const barHeight = (count / maxCount) * 100
      const y = 100 - barHeight
      
      // Add a small gap between bars if desired, or keep them flush
      const gap = 0.5
      
      return (
        <rect
            key={i}
            x={x + gap/2}
            y={y}
            width={Math.max(0, width - gap)}
            height={barHeight}
        />
      )
    })
  }, [data, min, max, bins])

  // Calculate clip path based on selected range
  const clipPathId = useMemo(() => `clip-${Math.random().toString(36).substr(2, 9)}`, [])
  const rangeX1 = selectedRange ? Math.max(0, ((selectedRange[0] - min) / (max - min)) * 100) : 0
  const rangeX2 = selectedRange ? Math.min(100, ((selectedRange[1] - min) / (max - min)) * 100) : 100

  return (
    <div className="w-full h-12 mb-[-12px] px-1 relative z-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            <defs>
                <clipPath id={clipPathId}>
                    <rect x={rangeX1} y="0" width={rangeX2 - rangeX1} height="100" />
                </clipPath>
            </defs>
            
            {/* Background Bars (Unselected) */}
            <g className="fill-muted/30">
                {pathData}
            </g>
            
            {/* Foreground Bars (Selected) */}
            <g className={color} clipPath={`url(#${clipPathId})`}>
                {pathData}
            </g>

            {/* Baseline Bar */}
            <rect x="0" y="98" width="100" height="2" className={color} />
        </svg>
    </div>
  )
}
