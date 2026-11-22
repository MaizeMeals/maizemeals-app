import Link from "next/link"
import { Flame, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"

type Totals = { calories: number; protein: number }

function Meter({ icon: Icon, label, value, goal, unit, tone }: {
  icon: typeof Flame
  label: string
  value: number
  goal: number
  unit: string
  tone: "orange" | "rose"
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "orange" ? "text-orange-500" : "text-rose-500")} aria-hidden />
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums text-foreground">
        {Math.round(value).toLocaleString()}
        {unit} <span className="text-sm font-medium text-muted-foreground">/ {Math.round(goal).toLocaleString()}{unit}</span>
      </p>
      <div className="h-1.5 rounded-full bg-border">
        <div className={cn("h-1.5 rounded-full", tone === "orange" ? "bg-orange-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Signed-in, and only once something is logged today. */
export function TodayMacros({ eaten, goals }: { eaten: Totals; goals: Totals }) {
  const proteinLeft = Math.max(0, Math.round(goals.protein - eaten.protein))
  return (
    <section aria-labelledby="macros-today-heading" className="mx-auto max-w-6xl px-4 pt-6">
      <Link
        href="/nutrition"
        className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 md:max-w-xl"
      >
        <div className="flex items-baseline justify-between">
          <h2 id="macros-today-heading" className="font-heading font-semibold text-umich-blue dark:text-white">
            Your macros today
          </h2>
          <span className="text-sm font-semibold text-umich-blue dark:text-maize">Open tracker</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Meter icon={Flame} label="Calories" value={eaten.calories} goal={goals.calories} unit="" tone="orange" />
          <Meter icon={Utensils} label="Protein" value={eaten.protein} goal={goals.protein} unit=" g" tone="rose" />
        </div>
        <p className="mt-3 text-sm text-foreground/80">
          {proteinLeft > 0 ? `${proteinLeft} g protein left today.` : "Protein goal reached today."}
        </p>
      </Link>
    </section>
  )
}
