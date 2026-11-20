"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Minus, PencilLine, Plus, Trash2 } from "lucide-react";
import {
  markPlannedEaten,
  updateFoodLogEntry,
  type FoodLogEntry,
} from "@/app/actions/macro-tracker";
import { AdditiveMarker } from "@/components/ingredients/AdditiveMarker";
import { FoodIcon } from "@/components/ingredients/FoodIcon";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { foodLogMealLabel, FOOD_LOG_MEALS, roundMacro, scaleMacros } from "@/lib/nutrition";
import { toast } from "@/lib/toast";

export function entryMacros(entry: FoodLogEntry) {
  return scaleMacros(
    {
      calories: Number(entry.calories_per_serving),
      protein: Number(entry.protein_g_per_serving),
      carbs: Number(entry.carbs_g_per_serving),
      fat: Number(entry.fat_g_per_serving),
    },
    Number(entry.servings),
  );
}

export function FoodLogRow({
  entry,
  additives,
  onUpdated,
  onDelete,
}: {
  entry: FoodLogEntry;
  additives?: string[];
  onUpdated: (entry: FoodLogEntry) => void;
  /** Parent removes it right away and offers Undo. */
  onDelete: (entry: FoodLogEntry) => void;
}) {
  const { track } = useAnalytics();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(String(Number(entry.servings)));
  const macros = entryMacros(entry);
  const custom = entry.item_id == null;

  useEffect(() => setDraft(String(Number(entry.servings))), [entry.servings]);

  const update = async (servings: number, meal = entry.meal_type) => {
    if (busy) return;
    if (!Number.isFinite(servings) || servings <= 0 || servings > 100) {
      toast.error("Servings must be more than 0 and at most 100.");
      setDraft(String(Number(entry.servings)));
      return;
    }
    const rounded = Math.round(servings * 100) / 100;
    if (rounded === Number(entry.servings) && meal === entry.meal_type) {
      setDraft(String(rounded));
      return;
    }
    setBusy(true);
    const result = await updateFoodLogEntry({ id: entry.id, servings: rounded, meal });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      setDraft(String(Number(entry.servings)));
      return;
    }
    onUpdated(result.data);
    track("food_log_entry_updated", { entry_id: entry.id, servings: rounded, meal });
  };

  const eaten = async () => {
    setBusy(true);
    const result = await markPlannedEaten(entry.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onUpdated(result.data);
    toast.success(`Logged ${entry.item_name}.`);
    track("food_log_planned_eaten", { entry_id: entry.id });
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {custom ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted" aria-hidden>
            <PencilLine className="h-4 w-4 text-muted-foreground" />
          </span>
        ) : (
          <FoodIcon name={entry.item_name} className="h-9 w-9 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-bold">{entry.item_name}</h4>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {custom ? "Custom" : entry.serving_size || "1 serving"} · {roundMacro(macros.calories)} cal ·{" "}
            {roundMacro(macros.protein)}g protein
          </p>
          <AdditiveMarker categories={additives} className="mt-1" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        {entry.is_planned ? (
          <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void eaten()}>
            <Check className="h-4 w-4" /> Ate it
          </Button>
        ) : (
          <select
            value={entry.meal_type}
            disabled={busy}
            onChange={(event) => void update(Number(entry.servings), event.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            aria-label={`Meal for ${entry.item_name}`}
          >
            {FOOD_LOG_MEALS.map((meal) => (
              <option key={meal} value={meal}>
                {foodLogMealLabel(meal)}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center rounded-lg border border-input bg-background">
          <button
            type="button"
            disabled={busy || Number(entry.servings) <= 0.25}
            onClick={() => void update(Number(entry.servings) - 0.25)}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label={`Decrease servings of ${entry.item_name}`}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            value={draft}
            inputMode="decimal"
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void update(Number(draft))}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setDraft(String(Number(entry.servings)));
            }}
            className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
            aria-label={`Servings of ${entry.item_name}`}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void update(Number(entry.servings) + 0.25)}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label={`Increase servings of ${entry.item_name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(entry)}
          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
          aria-label={`Delete ${entry.item_name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
