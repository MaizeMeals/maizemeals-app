"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Minus,
  Droplet,
  Plus,
  Settings2,
  Trash2,
  Utensils,
  Wheat,
} from "lucide-react";
import {
  deleteFoodLogEntry,
  getMacroTrackerDay,
  updateFoodLogEntry,
  type FoodLogEntry,
  type MacroTrackerDay,
} from "@/app/actions/macro-tracker";
import { Button } from "@/components/ui/button";
import { DateControls } from "@/components/locations/slug/DateControls";
import { MacroWizard } from "@/components/nutrition/MacroWizard";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  addMacros,
  dateInEasternTime,
  foodLogMealLabel,
  FOOD_LOG_MEALS,
  roundMacro,
  scaleMacros,
  type FoodLogMeal,
  type MacroSummary,
} from "@/lib/nutrition";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { toast } from "@/lib/toast";

const ZERO_MACROS: MacroSummary = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const MEAL_ORDER: FoodLogMeal[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"];

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function friendlyDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function entryMacros(entry: FoodLogEntry): MacroSummary {
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

function ProgressCard({
  label,
  value,
  goal,
  unit,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  icon: React.ElementType;
  color: string;
}) {
  const percentage = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const remaining = Math.max(0, goal - value);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className="text-3xl font-black tabular-nums">{roundMacro(value)}</span>
        <span className="mb-1 text-sm text-muted-foreground">/ {roundMacro(goal)}{unit}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${color.replace("text-", "bg-")}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {value > goal ? `${roundMacro(value - goal)}${unit} over goal` : `${roundMacro(remaining)}${unit} remaining`}
      </p>
    </div>
  );
}

function FoodLogRow({
  entry,
  onUpdated,
  onDeleted,
}: {
  entry: FoodLogEntry;
  onUpdated: (entry: FoodLogEntry) => void;
  onDeleted: (id: string) => void;
}) {
  const { track } = useAnalytics();
  const [busy, setBusy] = useState(false);
  const macros = entryMacros(entry);

  const update = async (servings: number, meal = entry.meal_type) => {
    if (servings <= 0 || busy) return;
    setBusy(true);
    const result = await updateFoodLogEntry({ id: entry.id, servings, meal });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onUpdated(result.data);
    track("food_log_entry_updated", { entry_id: entry.id, servings, meal });
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    const result = await deleteFoodLogEntry(entry.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onDeleted(entry.id);
    track("food_log_entry_deleted", { entry_id: entry.id, item_id: entry.item_id });
    toast.success("Food-log entry removed.");
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-bold">{entry.item_name}</h4>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.serving_size || "1 serving"} · {roundMacro(macros.calories)} Calories · {roundMacro(macros.protein)}g protein
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <select
          value={entry.meal_type}
          disabled={busy}
          onChange={(event) => void update(Number(entry.servings), event.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label={`Meal for ${entry.item_name}`}
        >
          {FOOD_LOG_MEALS.map((meal) => <option key={meal} value={meal}>{foodLogMealLabel(meal)}</option>)}
        </select>

        <div className="flex items-center rounded-lg border border-input bg-background">
          <button
            type="button"
            disabled={busy || Number(entry.servings) <= 0.25}
            onClick={() => void update(Number(entry.servings) - 0.25)}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Decrease servings"
          ><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-11 text-center text-sm font-semibold tabular-nums">{Number(entry.servings)}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void update(Number(entry.servings) + 0.25)}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Increase servings"
          ><Plus className="h-3.5 w-3.5" /></button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
          aria-label={`Delete ${entry.item_name}`}
        ><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function MacroTracker({
  initialDate,
  initialData,
  initialError,
  returnTo,
}: {
  initialDate: string;
  initialData: MacroTrackerDay;
  initialError: string | null;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const { track } = useAnalytics();
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const today = dateInEasternTime();

  useEffect(() => {
    track("macro_tracker_viewed", {
      selected_date: initialDate,
      initial_entry_count: initialData.entries.length,
    });
  }, [track, initialDate, initialData.entries.length]);

  useEffect(() => {
    if (initialError) toast.error(initialError);
  }, [initialError]);

  const changeDate = async (next: string) => {
    if (next === date) return;
    setLoading(true);
    const result = await getMacroTrackerDay(next);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setDate(next);
    setData(result.data);
    track("macro_tracker_date_changed", { selected_date: next });
  };

  const totals = useMemo(
    () => data.entries.reduce((sum, entry) => addMacros(sum, entryMacros(entry)), ZERO_MACROS),
    [data.entries],
  );

  const grouped = useMemo(
    () => MEAL_ORDER.map((meal) => ({
      meal,
      entries: data.entries.filter((entry) => entry.meal_type === meal),
    })).filter((group) => group.entries.length > 0),
    [data.entries],
  );

  if (data.needsWizard || editingProfile) {
    return (
      <MacroWizard
        initialSettings={data.goalSettings}
        onCancel={!data.needsWizard ? () => setEditingProfile(false) : undefined}
        onSaved={(settings) => {
          setData((current) => ({
            ...current,
            needsWizard: false,
            goalSettings: settings,
            goals: {
              calories: Number(settings.target_calories),
              protein: Number(settings.target_protein_g),
              carbs: Number(settings.target_carbs_g),
              fat: Number(settings.target_fat_g),
            },
          }));
          setEditingProfile(false);
          if (returnTo) router.push(returnTo);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 pb-16 pt-24 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-maize">Daily nutrition</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Macro Tracker</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Log campus menu items and compare your daily intake with your personal targets.
            </p>
          </div>
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => setEditingProfile(true)}>
            <Settings2 className="h-4 w-4" /> Edit targets
          </Button>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-border bg-card p-2 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => void changeDate(shiftDate(date, -1))}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Previous day</span>
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <DateControls
              selectedDate={date}
              onDateChange={(next) => void changeDate(next)}
              loading={loading}
            />
            <span className="truncate text-sm font-semibold md:hidden">
              {date === today ? `Today · ${friendlyDate(date)}` : friendlyDate(date)}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void changeDate(shiftDate(date, 1))}>
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Next day</span>
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ProgressCard label="Calories" value={totals.calories} goal={data.goals.calories} unit="" icon={Flame} color="text-orange-500" />
          <ProgressCard label="Protein" value={totals.protein} goal={data.goals.protein} unit="g" icon={Utensils} color="text-rose-500" />
          <ProgressCard label="Carbs" value={totals.carbs} goal={data.goals.carbs} unit="g" icon={Wheat} color="text-amber-500" />
          <ProgressCard label="Fat" value={totals.fat} goal={data.goals.fat} unit="g" icon={Droplet} color="text-blue-500" />
        </div>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Food log</h2>
              <p className="text-sm text-muted-foreground">{data.entries.length} {data.entries.length === 1 ? "item" : "items"} logged</p>
            </div>
            <Button asChild className={appPrimaryButtonClassName}>
              <Link href="/locations"><Plus className="h-4 w-4" /> Add food</Link>
            </Button>
          </div>

          {grouped.length > 0 ? (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.meal} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-bold">{foodLogMealLabel(group.meal)}</div>
                  {group.entries.map((entry) => (
                    <FoodLogRow
                      key={entry.id}
                      entry={entry}
                      onUpdated={(updated) => setData((current) => ({
                        ...current,
                        entries: current.entries.map((candidate) => candidate.id === updated.id ? updated : candidate),
                      }))}
                      onDeleted={(id) => setData((current) => ({
                        ...current,
                        entries: current.entries.filter((candidate) => candidate.id !== id),
                      }))}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <Utensils className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h3 className="mt-4 font-bold">Nothing logged for this day</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Open a dining location, select an item, and choose “Add to food log.”
              </p>
              <Button asChild className={`mt-5 ${appPrimaryButtonClassName}`}>
                <Link href="/locations">Browse campus menus</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
