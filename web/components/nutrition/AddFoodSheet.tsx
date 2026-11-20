"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Plus } from "lucide-react";
import {
  copyDay,
  getRecentFoods,
  logCustomFood,
  logFoodItem,
  relogEntry,
  type FoodLogEntry,
  type RecentFood,
} from "@/app/actions/macro-tracker";
import { FoodIcon } from "@/components/ingredients/FoodIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { SearchField } from "@/components/ui/search-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDayMenu } from "@/hooks/use-day-menu";
import { usePreferences } from "@/hooks/use-preferences";
import { useAnalytics } from "@/hooks/use-analytics";
import { buildDishes, locationKind } from "@/lib/day-menu/dishes";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { FOOD_LOG_MEALS, foodLogMealLabel, roundMacro, suggestedMeal, type FoodLogMeal } from "@/lib/nutrition";
import { toast } from "@/lib/toast";

function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function AddButton({ busy, label, onClick, disabled }: { busy: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-maize/60 bg-maize text-umich-blue shadow-sm disabled:opacity-40"
      aria-label={label}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}

/**
 * Add food without leaving MaizeMacros: search that day's campus menus,
 * re-log something recent, copy yesterday, or enter custom food.
 * Future days add to the plan instead of the log.
 */
export function AddFoodSheet({
  open,
  onOpenChange,
  date,
  today,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  today: string;
  onAdded: (entries: FoodLogEntry[]) => void;
}) {
  const planned = date > today;
  const { track } = useAnalytics();
  const [meal, setMeal] = useState<FoodLogMeal>(suggestedMeal());
  const [tab, setTab] = useState("menus");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentFood[] | null>(null);
  const { menu, loading: menuLoading } = useDayMenu(open ? date : null);
  const { preferences } = usePreferences();
  const [custom, setCustom] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  useEffect(() => {
    if (!open) return;
    setMeal(suggestedMeal());
    setQuery("");
    if (planned) setTab("menus");
    getRecentFoods().then((r) => setRecent(r.success ? r.data : []));
  }, [open, planned]);

  const results = useMemo(() => {
    if (!menu) return [];
    return buildDishes(menu, preferences, {
      query,
      meal: "Any",
      include: () => true,
      includeRetail: true,
      nowMinutes: null,
    })
      .filter((d) => d.primary.macros.calories > 0)
      .sort((a, b) => b.relevance - a.relevance || b.score - a.score)
      .slice(0, 40);
  }, [menu, preferences, query]);

  const done = (entries: FoodLogEntry[], name: string) => {
    onAdded(entries);
    toast.success(planned ? `Planned ${name}.` : `Logged ${name}.`);
  };

  const addMenuItem = async (itemId: string, name: string) => {
    setBusy(itemId);
    const res = await logFoodItem({ itemId, servings: 1, meal, consumedOn: date, planned });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    done([res.data], name);
    track("macro_add_sheet_logged", { source: "menu", planned });
  };

  const addRecent = async (food: RecentFood) => {
    setBusy(food.entryId);
    const res = await relogEntry({ entryId: food.entryId, consumedOn: date, meal });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    done([res.data], food.name);
    track("macro_add_sheet_logged", { source: "recent" });
  };

  const copyYesterday = async () => {
    setBusy("copy");
    const res = await copyDay({ fromDate: shift(date, -1), toDate: date });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    done(res.data, `${res.data.length} item${res.data.length === 1 ? "" : "s"} from yesterday`);
    track("macro_add_sheet_logged", { source: "copy_day", count: res.data.length });
  };

  const addCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    setBusy("custom");
    const res = await logCustomFood({
      name: custom.name,
      calories: Number(custom.calories),
      protein: num(custom.protein),
      carbs: num(custom.carbs),
      fat: num(custom.fat),
      meal,
      consumedOn: date,
    });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    done([res.data], custom.name.trim());
    setCustom({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    track("macro_add_sheet_logged", { source: "custom" });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="md:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{planned ? "Plan food" : "Add food"}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {planned
              ? "Planned dishes don't count until you tap “Ate it”."
              : "Search campus menus, re-log something recent, or enter your own."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Meal</span>
            <select
              value={meal}
              onChange={(e) => setMeal(e.target.value as FoodLogMeal)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {FOOD_LOG_MEALS.map((m) => (
                <option key={m} value={m}>
                  {foodLogMealLabel(m)}
                </option>
              ))}
            </select>
          </label>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid h-10 w-full grid-cols-3">
              <TabsTrigger value="menus">Menus</TabsTrigger>
              <TabsTrigger value="recent" disabled={planned}>
                Recent
              </TabsTrigger>
              <TabsTrigger value="custom" disabled={planned}>
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="menus" className="mt-3 space-y-2">
              <SearchField value={query} onValueChange={setQuery} placeholder="Search this day's menus" />
              {menuLoading ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading menus…
                </p>
              ) : results.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  {menu ? "No dishes match." : "No menus posted for this day."}
                </p>
              ) : (
                <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {results.map((dish) => {
                    const o = dish.offerings[0];
                    const more = dish.offerings.length - 1;
                    return (
                      <li key={dish.key} className="flex items-center gap-3 px-3 py-2.5">
                        <FoodIcon name={dish.name} className="h-8 w-8 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{dish.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {o.hall.name}
                            {more > 0 ? ` +${more} more` : ""} · {locationKind(o.hall) ?? o.meal} ·{" "}
                            {roundMacro(o.item.macros.calories)} cal · {roundMacro(o.item.macros.protein)}g protein
                          </p>
                        </div>
                        <AddButton
                          busy={busy === o.item.id}
                          disabled={busy !== null}
                          label={`${planned ? "Plan" : "Log"} ${dish.name}`}
                          onClick={() => void addMenuItem(o.item.id, dish.name)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="recent" className="mt-3 space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={busy !== null}
                onClick={() => void copyYesterday()}
              >
                {busy === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Copy everything from the day before
              </Button>
              {recent === null ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : recent.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Foods you log show up here for one-tap re-logging.</p>
              ) : (
                <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {recent.map((f) => (
                    <li key={f.entryId} className="flex items-center gap-3 px-3 py-2.5">
                      <FoodIcon name={f.name} className="h-8 w-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{f.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {roundMacro(f.calories)} cal · {roundMacro(f.protein)}g protein · logged {f.times}×
                          {f.isCustom ? " · custom" : ""}
                        </p>
                      </div>
                      <AddButton
                        busy={busy === f.entryId}
                        disabled={busy !== null}
                        label={`Log ${f.name} again`}
                        onClick={() => void addRecent(f)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-3">
              <form onSubmit={addCustom} className="space-y-3">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">What was it?</span>
                  <Input
                    required
                    maxLength={120}
                    value={custom.name}
                    onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))}
                    placeholder="e.g. Iced latte, Pizza House slice"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ["calories", "Calories", true],
                      ["protein", "Protein (g)", false],
                      ["carbs", "Carbs (g)", false],
                      ["fat", "Fat (g)", false],
                    ] as const
                  ).map(([key, label, required]) => (
                    <label key={key} className="block space-y-1 text-sm">
                      <span className="font-medium">{label}</span>
                      <Input
                        required={required}
                        inputMode="decimal"
                        type="number"
                        min={0}
                        step="any"
                        value={custom[key]}
                        onChange={(e) => setCustom((c) => ({ ...c, [key]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
                <Button type="submit" className={`w-full ${appPrimaryButtonClassName}`} disabled={busy !== null}>
                  {busy === "custom" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add to log
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
