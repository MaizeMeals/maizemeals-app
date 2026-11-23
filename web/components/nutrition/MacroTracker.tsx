"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Download,
  Droplet,
  Flame,
  Plus,
  Settings2,
  Utensils,
  Wheat,
} from "lucide-react";
import {
  deleteFoodLogEntry,
  getMacroTrackerDay,
  getWeekSummary,
  type FoodLogEntry,
  type MacroTrackerDay,
  type WeekSummary,
} from "@/app/actions/macro-tracker";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { DateControls } from "@/components/locations/slug/DateControls";
import { AddFoodSheet } from "@/components/nutrition/AddFoodSheet";
import { FoodLogRow, entryMacros } from "@/components/nutrition/FoodLogRow";
import { MacroWizard } from "@/components/nutrition/MacroWizard";
import { NutrientRow } from "@/components/nutrition/NutrientRow";
import { ProgressCard } from "@/components/nutrition/ProgressCard";
import { SuggestionsCard } from "@/components/nutrition/SuggestionsCard";
import { WeekStrip } from "@/components/nutrition/WeekStrip";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  addExtraNutrients,
  addMacros,
  dateInEasternTime,
  extraNutrients,
  foodLogMealLabel,
  type ExtraNutrients,
  type FoodLogMeal,
  type MacroSummary,
} from "@/lib/nutrition";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { toast } from "@/lib/toast";

const ZERO_MACROS: MacroSummary = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const ZERO_EXTRA: ExtraNutrients = { fiber: 0, sugar: 0, sodium: 0, satFat: 0 };
const MEAL_ORDER: FoodLogMeal[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"];
/** How far ahead dishes can be planned (matches the server). */
const PLAN_DAYS_AHEAD = 7;
const UNDO_MS = 5000;

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function friendlyDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function MacroTracker({
  initialDate,
  initialData,
  initialError,
  returnTo,
  startEditing = false,
}: {
  initialDate: string;
  initialData: MacroTrackerDay;
  initialError: string | null;
  returnTo?: string | null;
  /** Open the target editor right away (Settings → Edit targets). */
  startEditing?: boolean;
}) {
  const router = useRouter();
  const { track } = useAnalytics();
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(startEditing);
  const [addOpen, setAddOpen] = useState(false);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const today = dateInEasternTime();
  const maxDate = shiftDate(today, PLAN_DAYS_AHEAD);
  const isFuture = date > today;

  // Deletes wait UNDO_MS so "Undo" can put the row back without a server call.
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const flushDelete = useCallback(async (entry: FoodLogEntry, restore: () => void) => {
    pendingDeletes.current.delete(entry.id);
    const result = await deleteFoodLogEntry(entry.id);
    if (!result.success) {
      restore();
      toast.error(result.error);
    }
  }, []);

  const refreshWeek = useCallback(async (end: string) => {
    const result = await getWeekSummary(end > today ? today : end);
    if (result.success) setWeek(result.data);
  }, [today]);

  useEffect(() => {
    track("macro_tracker_viewed", {
      selected_date: initialDate,
      initial_entry_count: initialData.entries.length,
    });
  }, [track, initialDate, initialData.entries.length]);

  useEffect(() => {
    if (initialError) toast.error(initialError);
  }, [initialError]);

  useEffect(() => {
    void refreshWeek(date);
  }, [date, refreshWeek]);

  // Leaving the page runs any delete still waiting on Undo.
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        void deleteFoodLogEntry(id);
      }
      pending.clear();
    };
  }, []);

  const flushAllPending = () => {
    for (const [id, timer] of pendingDeletes.current) {
      clearTimeout(timer);
      void deleteFoodLogEntry(id);
    }
    pendingDeletes.current.clear();
  };

  const changeDate = async (next: string) => {
    if (next === date || next > maxDate) return;
    flushAllPending();
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

  const eaten = useMemo(() => data.entries.filter((e) => !e.is_planned), [data.entries]);
  const planned = useMemo(() => data.entries.filter((e) => e.is_planned), [data.entries]);
  // Future days only have planned food: show what the plan adds up to.
  const counted = isFuture ? planned : eaten;

  const totals = useMemo(
    () => counted.reduce((sum, entry) => addMacros(sum, entryMacros(entry)), ZERO_MACROS),
    [counted],
  );
  const extra = useMemo(
    () => counted.reduce((sum, e) => addExtraNutrients(sum, extraNutrients(e.nutrition_snapshot, Number(e.servings))), ZERO_EXTRA),
    [counted],
  );
  const additiveCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of counted) {
      for (const c of (e.item_id && data.itemAdditives[e.item_id]) || []) counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [counted, data.itemAdditives]);
  const remaining = useMemo(
    () => ({
      calories: data.goals.calories - totals.calories,
      protein: data.goals.protein - totals.protein,
      carbs: data.goals.carbs - totals.carbs,
      fat: data.goals.fat - totals.fat,
    }),
    [data.goals, totals],
  );

  const grouped = useMemo(
    () =>
      MEAL_ORDER.map((meal) => ({ meal, entries: eaten.filter((entry) => entry.meal_type === meal) })).filter(
        (group) => group.entries.length > 0,
      ),
    [eaten],
  );

  const addEntries = (entries: FoodLogEntry[]) => {
    setData((current) => ({
      ...current,
      entries: [...current.entries, ...entries.filter((e) => e.consumed_on === date)],
    }));
    void refreshWeek(date);
  };

  const replaceEntry = (updated: FoodLogEntry) => {
    setData((current) => ({
      ...current,
      entries:
        updated.consumed_on === date
          ? current.entries.map((c) => (c.id === updated.id ? updated : c))
          : current.entries.filter((c) => c.id !== updated.id),
    }));
    void refreshWeek(date);
  };

  const requestDelete = (entry: FoodLogEntry) => {
    const index = data.entries.findIndex((e) => e.id === entry.id);
    setData((current) => ({ ...current, entries: current.entries.filter((e) => e.id !== entry.id) }));
    const restore = () =>
      setData((current) => {
        if (current.entries.some((e) => e.id === entry.id)) return current;
        const entries = [...current.entries];
        entries.splice(Math.min(index, entries.length), 0, entry);
        return { ...current, entries };
      });
    const timer = setTimeout(() => {
      void flushDelete(entry, restore).then(() => refreshWeek(date));
    }, UNDO_MS);
    pendingDeletes.current.set(entry.id, timer);
    track("food_log_entry_deleted", { entry_id: entry.id, item_id: entry.item_id });
    toast.success(`Removed ${entry.item_name}`, {
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeletes.current.get(entry.id);
          if (pending) clearTimeout(pending);
          pendingDeletes.current.delete(entry.id);
          restore();
        },
      },
    });
  };

  if (editingProfile) {
    return (
      <MacroWizard
        initialSettings={data.goalSettings}
        onCancel={() => {
          setEditingProfile(false);
          router.replace("/nutrition");
        }}
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
          else router.replace("/nutrition");
        }}
      />
    );
  }

  return (
    <PageShell className="min-h-screen bg-muted/20 pb-16">
      <PageHeader
        className="mb-6"
        title="MaizeMacros"
        description="Log what you eat from campus menus (or anywhere else) and compare it with your targets."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon" className="rounded-full" aria-label="Download your food log (CSV)">
              <a href="/nutrition/export" download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => setEditingProfile(true)}>
              <Settings2 className="h-4 w-4" /> Edit targets
            </Button>
          </div>
        }
      />

      {data.needsWizard ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-maize/50 bg-maize/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold">You&apos;re using default targets</span> ({data.goals.calories.toLocaleString()} cal,{" "}
            {data.goals.protein}g protein). A 1-minute estimate makes them yours.
          </p>
          <Button size="sm" className={appPrimaryButtonClassName} onClick={() => setEditingProfile(true)}>
            Personalize targets
          </Button>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-2 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => void changeDate(shiftDate(date, -1))} aria-label="Previous day">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <DateControls selectedDate={date} onDateChange={(next) => void changeDate(next)} loading={loading} />
          <span className="truncate text-sm font-semibold">
            {date === today ? `Today · ${friendlyDate(date)}` : friendlyDate(date)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={date >= maxDate}
          onClick={() => void changeDate(shiftDate(date, 1))}
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isFuture ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" aria-hidden /> Planning ahead: these totals are what your plan adds up to.
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ProgressCard label="Calories" value={totals.calories} goal={data.goals.calories} unit="" spokenUnit="calories" icon={Flame} barClass="bg-orange-500" iconClass="text-orange-500" />
        <ProgressCard label="Protein" value={totals.protein} goal={data.goals.protein} unit="g" spokenUnit="grams" icon={Utensils} barClass="bg-rose-500" iconClass="text-rose-500" kind="goal" />
        <ProgressCard label="Carbs" value={totals.carbs} goal={data.goals.carbs} unit="g" spokenUnit="grams" icon={Wheat} barClass="bg-amber-500" iconClass="text-amber-500" />
        <ProgressCard label="Fat" value={totals.fat} goal={data.goals.fat} unit="g" spokenUnit="grams" icon={Droplet} barClass="bg-blue-500" iconClass="text-blue-500" />
      </div>
      <NutrientRow totals={extra} additiveCounts={additiveCounts} />

      {date === today ? <SuggestionsCard today={today} remaining={remaining} onLogged={(e) => addEntries([e])} /> : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{isFuture ? "Plan" : "Food log"}</h2>
            <p className="text-sm text-muted-foreground">
              {isFuture
                ? `${planned.length} ${planned.length === 1 ? "dish" : "dishes"} planned`
                : `${eaten.length} ${eaten.length === 1 ? "item" : "items"} logged`}
            </p>
          </div>
          <Button className={appPrimaryButtonClassName} onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> {isFuture ? "Plan food" : "Add food"}
          </Button>
        </div>

        {planned.length > 0 ? (
          <div className="mb-4 overflow-hidden rounded-2xl border border-dashed border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-bold">
              <CalendarClock className="h-4 w-4" aria-hidden /> Planned
              <span className="font-normal text-muted-foreground">· tap “Ate it” to count it</span>
            </div>
            {planned.map((entry) => (
              <FoodLogRow
                key={entry.id}
                entry={entry}
                additives={entry.item_id ? data.itemAdditives[entry.item_id] : undefined}
                onUpdated={replaceEntry}
                onDelete={requestDelete}
              />
            ))}
          </div>
        ) : null}

        {grouped.length > 0 ? (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.meal} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-bold">{foodLogMealLabel(group.meal)}</div>
                {group.entries.map((entry) => (
                  <FoodLogRow
                    key={entry.id}
                    entry={entry}
                    additives={entry.item_id ? data.itemAdditives[entry.item_id] : undefined}
                    onUpdated={replaceEntry}
                    onDelete={requestDelete}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : !isFuture && planned.length === 0 ? (
          <Empty className="rounded-2xl border border-dashed border-border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Utensils />
              </EmptyMedia>
              <EmptyTitle>Nothing logged for this day</EmptyTitle>
              <EmptyDescription>
                Tap <strong>Add food</strong> to search campus menus, or open a dish anywhere in MaizeMeals and tap{" "}
                <strong>Add to log</strong>.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center">
              <Button className={appPrimaryButtonClassName} onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add food
              </Button>
              <Button asChild variant="outline">
                <Link href="/menus">Find food to log</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
      </section>

      {week ? (
        <WeekStrip
          days={week.days}
          goal={data.goals.calories}
          proteinGoal={data.goals.protein}
          streak={week.streak}
          selected={date}
          today={today}
          onSelect={(d) => void changeDate(d)}
        />
      ) : null}

      <AddFoodSheet open={addOpen} onOpenChange={setAddOpen} date={date} today={today} onAdded={addEntries} />
    </PageShell>
  );
}
