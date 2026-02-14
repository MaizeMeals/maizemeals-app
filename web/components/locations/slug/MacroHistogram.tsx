"use client"

import { useMemo, useId } from "react"

interface MacroHistogramProps {
  data: number[]
  min: number
  max: number
  bins?: number
  color?: string
  selectedRange?: [number, number]
}

export function MacroHistogram({
  data,
  min,
  max,
  bins = 40, // Increased bins for smoother Airbnb look
  color = "fill-primary", // Expecting a utility class like "fill-orange-500"
  selectedRange
}: MacroHistogramProps) {
  // 1. Stable ID for ClipPath (Fixes Disappearing Chart)
  const uuid = useId()
  const clipPathId = `histogram-clip-${uuid}`

  // 2. Calculate Bar Geometry
  const bars = useMemo(() => {
    if (data.length === 0) return []

    const binSize = (max - min) / bins
    const counts = new Array(bins).fill(0)
    let maxCount = 0

    // Populate bins
    data.forEach(val => {
      // Clamp values to ensure they fall within the visible range
      const clampedVal = Math.max(min, Math.min(max, val))
      const binIndex = Math.min(Math.floor((clampedVal - min) / binSize), bins - 1)
      counts[binIndex]++
      if (counts[binIndex] > maxCount) maxCount = counts[binIndex]
    })

    if (maxCount === 0) return []

    // Map to SVG coordinates (0-100 scale)
    return counts.map((count, i) => {
      const heightPercent = (count / maxCount) * 100
      // Ensure even small values have a tiny bar (2%) so the chart isn't empty
      const visualHeight = count > 0 ? Math.max(heightPercent, 2) : 0

      return {
        x: (i / bins) * 100,
        width: (1 / bins) * 100,
        y: 100 - visualHeight,
        height: visualHeight,
      }
    })
  }, [data, min, max, bins])

  // 3. Calculate Mask Position (0% to 100%)
  const mask = useMemo(() => {
    if (!selectedRange) return { x: 0, width: 100 }

    // Convert values to percentages
    const startPct = Math.max(0, ((selectedRange[0] - min) / (max - min)) * 100)
    const endPct = Math.min(100, ((selectedRange[1] - min) / (max - min)) * 100)

    return { x: startPct, width: endPct - startPct }
  }, [selectedRange, min, max])

  return (
    // w-full and h-full allow the parent to control sizing
    <div className="w-full h-full relative">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible block"
      >
        <defs>
          <clipPath id={clipPathId}>
            <rect x={mask.x} y="0" width={mask.width} height="100" />
          </clipPath>
        </defs>

        {/* Layer 1: Background Bars (Inactive Gray) */}
        <g className="fill-slate-200 dark:fill-slate-800">
          {bars.map((bar, i) => (
            <rect
              key={`bg-${i}`}
              x={bar.x + 0.5} // Slight gap offset
              y={bar.y}
              width={Math.max(0, bar.width - 0.5)} // Slight gap width
              height={bar.height}
              rx="0.5" // Subtle rounded top corners
            />
          ))}
        </g>

        {/* Layer 2: Foreground Bars (Active Color), Masked by ClipPath */}
        <g className={color} clipPath={`url(#${clipPathId})`}>
          {bars.map((bar, i) => (
            <rect
              key={`fg-${i}`}
              x={bar.x + 0.5}
              y={bar.y}
              width={Math.max(0, bar.width - 0.5)}
              height={bar.height}
              rx="0.5"
            />
          ))}
        </g>

        {/* Optional: Bottom Baseline for structure */}
        <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
      </svg>
    </div>
  )
}
