import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { roundMacro } from "@/lib/nutrition";

/**
 * One macro's progress. `kind="limit"` (calories, carbs, fat) turns orange
 * past the goal; `kind="goal"` (protein) just says "Goal reached".
 */
export function ProgressCard({
  label,
  value,
  goal,
  unit,
  spokenUnit,
  icon: Icon,
  barClass,
  iconClass,
  kind = "limit",
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  /** For screen readers: "grams", "calories". */
  spokenUnit: string;
  icon: ElementType;
  barClass: string;
  iconClass: string;
  kind?: "limit" | "goal";
}) {
  const percentage = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = value > goal;
  const warn = over && kind === "limit";
  const caption = over
    ? kind === "goal"
      ? "Goal reached"
      : `${roundMacro(value - goal)}${unit} over goal`
    : `${roundMacro(Math.max(0, goal - value))}${unit} remaining`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <Icon className={cn("h-5 w-5", iconClass)} aria-hidden />
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className="text-3xl font-black tabular-nums">{roundMacro(value)}</span>
        <span className="mb-1 text-sm text-muted-foreground">
          / {roundMacro(goal)}
          {unit}
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(goal)}
        aria-label={`${label} ${Math.round(value)} of ${Math.round(goal)} ${spokenUnit}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            warn ? "bg-orange-500 dark:bg-orange-400" : barClass,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={cn("mt-2 text-xs", warn ? "font-medium text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
        {caption}
      </p>
    </div>
  );
}
