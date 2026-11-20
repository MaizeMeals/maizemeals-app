"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, PlusCircle } from "lucide-react";
import { logFoodItem } from "@/app/actions/macro-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
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
  const todayStr = dateInEasternTime();
  const maxPlanDate = (() => {
    const d = new Date(`${todayStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const isPlanned = consumedOn > todayStr;

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
      planned: isPlanned,
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
    toast.success(
      isPlanned
        ? `Planned ${item.name} for ${consumedOn}.`
        : `Added +${roundMacro(total.calories)} Calories to Daily Log.`,
    );
    setOpen(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
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
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="pr-8">Add to food log</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {item.name} · {item.serving_size || "1 serving"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-5">
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
            <span className="text-sm font-semibold">{isPlanned ? "Planned for" : "Date eaten"}</span>
            <Input
              type="date"
              value={consumedOn}
              max={maxPlanDate}
              onChange={(event) => setConsumedOn(event.target.value)}
            />
            {isPlanned ? (
              <span className="block text-xs text-muted-foreground">
                Future dates go on your plan. They count once you tap “Ate it” in MaizeMacros.
              </span>
            ) : null}
          </label>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <ResponsiveDialogClose asChild>
            <Button variant="outline" disabled={saving}>Cancel</Button>
          </ResponsiveDialogClose>
          <Button onClick={save} disabled={saving} className={appPrimaryButtonClassName}>
            <Check className="h-4 w-4" />
            {saving ? "Adding…" : "Add item"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
