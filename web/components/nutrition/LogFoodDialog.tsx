"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, PlusCircle, X } from "lucide-react";
import { logFoodItem } from "@/app/actions/macro-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  dateInEasternTime,
  FOOD_LOG_MEALS,
  foodLogMealLabel,
  macroSummaryFromNutrition,
  roundMacro,
  scaleMacros,
  suggestedMeal,
  type FoodLogMeal,
} from "@/lib/nutrition";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { toast } from "@/lib/toast";
import type { Item } from "@/types/dining";

export function LogFoodDialog({
  item,
  trigger,
  defaultMeal,
}: {
  item: Item;
  trigger?: ReactNode;
  defaultMeal?: FoodLogMeal;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { track } = useAnalytics();
  const [open, setOpen] = useState(false);
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<FoodLogMeal>(() => defaultMeal ?? suggestedMeal());
  const [consumedOn, setConsumedOn] = useState(() => dateInEasternTime());
  const [saving, setSaving] = useState(false);

  const perServing = useMemo(
    () => macroSummaryFromNutrition(item.macronutrients),
    [item.macronutrients],
  );
  const servingCount = Number(servings);
  const total = scaleMacros(perServing, Number.isFinite(servingCount) ? servingCount : 0);
  const hasNutrition = Object.values(perServing).some((value) => value > 0);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setServings("1");
      setMeal(defaultMeal ?? suggestedMeal());
      setConsumedOn(dateInEasternTime());
      track("food_log_dialog_opened", { item_id: item.id, item_name: item.name });
    }
  };

  const save = async () => {
    if (!Number.isFinite(servingCount) || servingCount <= 0 || servingCount > 100) {
      toast.error("Enter a serving amount between 0 and 100.");
      return;
    }

    setSaving(true);
    const result = await logFoodItem({
      itemId: item.id,
      servings: servingCount,
      meal,
      consumedOn,
    });
    setSaving(false);

    if (!result.success) {
      if (result.status === 401) {
        const next = pathname ? `${pathname}?item=${encodeURIComponent(item.id)}` : "/nutrition";
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (result.status === 428) {
        const returnTo = pathname
          ? `${pathname}?item=${encodeURIComponent(item.id)}`
          : "/locations";
        toast.info(result.error);
        router.push(`/nutrition?return_to=${encodeURIComponent(returnTo)}`);
        return;
      }
      toast.error(result.error);
      return;
    }

    track("food_logged", {
      item_id: item.id,
      item_name: item.name,
      servings: servingCount,
      meal,
      calories: total.calories,
    });
    toast.success(`Added +${roundMacro(total.calories)} Calories to Daily Log.`);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <Button
            size="lg"
            disabled={!hasNutrition || item.item_type === "station_header"}
            className={`w-full gap-2 shadow-lg ${appPrimaryButtonClassName}`}
          >
            <PlusCircle className="h-5 w-5" />
            {hasNutrition ? "Add to food log" : "Nutrition unavailable"}
          </Button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[min(calc(100vw-1.5rem),430px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-0 shadow-2xl">
          <div className="border-b border-border px-5 py-4 pr-12">
            <Dialog.Title className="text-lg font-bold">Add to food log</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              {item.name} · {item.serving_size || "1 serving"}
            </Dialog.Description>
            <Dialog.Close className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3 text-center">
              {[
                ["Calories", roundMacro(total.calories), ""],
                ["Protein", roundMacro(total.protein), "g"],
                ["Carbs", roundMacro(total.carbs), "g"],
                ["Fat", roundMacro(total.fat), "g"],
              ].map(([label, value, unit]) => (
                <div key={String(label)}>
                  <div className="text-base font-bold tabular-nums">
                    {value}{unit}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Servings</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0.1"
                max="100"
                step="0.25"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Meal</span>
              <select
                value={meal}
                onChange={(event) => setMeal(event.target.value as FoodLogMeal)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {FOOD_LOG_MEALS.map((option) => (
                  <option key={option} value={option}>{foodLogMealLabel(option)}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Date eaten</span>
              <Input
                type="date"
                value={consumedOn}
                onChange={(event) => setConsumedOn(event.target.value)}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={saving}>Cancel</Button>
            </Dialog.Close>
            <Button onClick={save} disabled={saving} className={appPrimaryButtonClassName}>
              <Check className="h-4 w-4" />
              {saving ? "Adding…" : "Add item"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
