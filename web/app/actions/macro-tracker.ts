"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  dateInEasternTime,
  DEFAULT_NUTRITION_GOALS,
  FOOD_LOG_MEALS,
  MACRO_GOAL_TYPES,
  macroSummaryFromNutrition,
  type FoodLogMeal,
  type MacroSummary,
  type MacroTargetInput,
} from "@/lib/nutrition";
import type { Database } from "@/types/supabase";

export type FoodLogEntry = Database["public"]["Tables"]["food_logs"]["Row"];
export type UserMacroGoals = Database["public"]["Tables"]["user_macro_goals"]["Row"];

export type MacroTrackerDay = {
  goals: MacroSummary;
  goalSettings: UserMacroGoals | null;
  /** Targets not personalized yet: the tracker uses DEFAULT_NUTRITION_GOALS. */
  needsWizard: boolean;
  entries: FoodLogEntry[];
  /** Additive highlight categories per menu item logged that day. */
  itemAdditives: Record<string, string[]>;
};

export type MacroTrackerResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validDate(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function validMeal(meal: string): meal is FoodLogMeal {
  return (FOOD_LOG_MEALS as readonly string[]).includes(meal);
}

/** Furthest ahead a dish can be planned. */
const PLAN_DAYS_AHEAD = 7;

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Eaten entries can't be in the future; planned ones up to a week ahead. */
function dateAllowed(date: string, planned: boolean): string | null {
  const today = dateInEasternTime();
  if (!planned && date > today) return "You can't log food for a future date. Plan it instead.";
  if (planned && date > addDays(today, PLAN_DAYS_AHEAD)) return "You can plan up to a week ahead.";
  return null;
}

function validServings(servings: number): boolean {
  return Number.isFinite(servings) && servings > 0 && servings <= 100;
}

function validMacroTargets(input: MacroTargetInput): boolean {
  return (
    Number.isInteger(input.goals.calories) &&
    input.goals.calories > 0 &&
    input.goals.calories <= 10000 &&
    Number.isFinite(input.goals.protein) &&
    input.goals.protein >= 0 &&
    input.goals.protein <= 1000 &&
    Number.isFinite(input.goals.carbs) &&
    input.goals.carbs >= 0 &&
    input.goals.carbs <= 2000 &&
    Number.isFinite(input.goals.fat) &&
    input.goals.fat >= 0 &&
    input.goals.fat <= 1000 &&
    (MACRO_GOAL_TYPES as readonly string[]).includes(input.goalType)
  );
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function getMacroTrackerDay(
  date: string,
): Promise<MacroTrackerResult<MacroTrackerDay>> {
  if (!validDate(date)) return { success: false, error: "Invalid date." };

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return { success: false, error: "You must be signed in.", status: 401 };
  }

  const [{ data: goalSettings, error: goalsError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase
        .from("user_macro_goals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("consumed_on", date)
        .order("logged_at", { ascending: true }),
    ]);

  if (goalsError || entriesError) {
    console.error("[macro-tracker] load failed", { goalsError, entriesError });
    return { success: false, error: "Could not load your nutrition data." };
  }

  const itemIds = [...new Set((entries ?? []).map((e) => e.item_id).filter((id): id is string => Boolean(id)))];
  const itemAdditives: Record<string, string[]> = {};
  if (itemIds.length) {
    const { data: flags } = await supabase.from("items").select("id, ingredient_flags").in("id", itemIds);
    for (const row of flags ?? []) {
      const categories = (row.ingredient_flags as { categories?: unknown } | null)?.categories;
      if (Array.isArray(categories)) itemAdditives[row.id] = categories as string[];
    }
  }

  const goals = goalSettings
    ? {
        calories: Number(goalSettings.target_calories),
        protein: Number(goalSettings.target_protein_g),
        carbs: Number(goalSettings.target_carbs_g),
        fat: Number(goalSettings.target_fat_g),
      }
    : DEFAULT_NUTRITION_GOALS;

  return {
    success: true,
    data: {
      goals,
      goalSettings,
      needsWizard: !goalSettings?.setup_completed,
      entries: entries ?? [],
      itemAdditives,
    },
  };
}

export async function logFoodItem(input: {
  itemId: string;
  servings: number;
  meal: string;
  consumedOn: string;
  /** Planned for later: excluded from totals until marked eaten. */
  planned?: boolean;
}): Promise<MacroTrackerResult<FoodLogEntry>> {
  if (!UUID_REGEX.test(input.itemId)) {
    return { success: false, error: "Invalid menu item." };
  }
  if (!validServings(input.servings)) {
    return { success: false, error: "Servings must be between 0 and 100." };
  }
  if (!validMeal(input.meal)) {
    return { success: false, error: "Invalid meal." };
  }
  if (!validDate(input.consumedOn)) {
    return { success: false, error: "Invalid date." };
  }
  const planned = Boolean(input.planned);
  const dateError = dateAllowed(input.consumedOn, planned);
  if (dateError) return { success: false, error: dateError };

  // No setup gate: people can log first and personalize targets later
  // (the tracker uses default targets until then).
  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return { success: false, error: "You must be signed in.", status: 401 };
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, name, serving_size, macronutrients, item_type")
    .eq("id", input.itemId)
    .single();

  if (itemError || !item || item.item_type === "station_header") {
    return { success: false, error: "That menu item is not available to log." };
  }

  const macros = macroSummaryFromNutrition(item.macronutrients);
  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      item_id: item.id,
      item_name: item.name,
      serving_size: item.serving_size,
      servings: input.servings,
      meal_type: input.meal,
      consumed_on: input.consumedOn,
      is_planned: planned,
      calories_per_serving: macros.calories,
      protein_g_per_serving: macros.protein,
      carbs_g_per_serving: macros.carbs,
      fat_g_per_serving: macros.fat,
      nutrition_snapshot: item.macronutrients ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[macro-tracker] log insert failed", error);
    return { success: false, error: "Could not add this item to your food log." };
  }

  revalidatePath("/nutrition");
  return { success: true, data };
}

export async function updateFoodLogEntry(input: {
  id: string;
  servings: number;
  meal: string;
}): Promise<MacroTrackerResult<FoodLogEntry>> {
  if (!UUID_REGEX.test(input.id) || !validServings(input.servings) || !validMeal(input.meal)) {
    return { success: false, error: "Invalid food-log update." };
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return { success: false, error: "You must be signed in.", status: 401 };
  }

  const { data, error } = await supabase
    .from("food_logs")
    .update({
      servings: input.servings,
      meal_type: input.meal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: "Could not update this food-log entry." };
  }

  revalidatePath("/nutrition");
  return { success: true, data };
}

export async function deleteFoodLogEntry(
  id: string,
): Promise<MacroTrackerResult<{ id: string }>> {
  if (!UUID_REGEX.test(id)) return { success: false, error: "Invalid food-log entry." };

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return { success: false, error: "You must be signed in.", status: 401 };
  }

  const { error } = await supabase.from("food_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { success: false, error: "Could not delete this food-log entry." };

  revalidatePath("/nutrition");
  return { success: true, data: { id } };
}

export async function saveMacroTargets(
  input: MacroTargetInput,
): Promise<MacroTrackerResult<UserMacroGoals>> {
  if (!validMacroTargets(input)) {
    return { success: false, error: "Check your macro targets and try again." };
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return { success: false, error: "You must be signed in.", status: 401 };
  }

  const { data, error } = await supabase
    .from("user_macro_goals")
    .upsert({
      user_id: user.id,
      target_calories: input.goals.calories,
      target_protein_g: input.goals.protein,
      target_carbs_g: input.goals.carbs,
      target_fat_g: input.goals.fat,
      goal_type: input.goalType,
      setup_completed: true,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[macro-tracker] target update failed", error);
    return { success: false, error: "Could not save your MaizeMacros targets." };
  }

  revalidatePath("/nutrition");
  revalidatePath("/locations", "layout");
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// Custom foods, re-logging, planning, history
// ---------------------------------------------------------------------------

export type CustomFoodInput = {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servings?: number;
  meal: string;
  consumedOn: string;
};

/** Food that isn't on a campus menu (snack, coffee, off-campus meal). */
export async function logCustomFood(input: CustomFoodInput): Promise<MacroTrackerResult<FoodLogEntry>> {
  const name = input.name?.trim().slice(0, 120);
  const servings = input.servings ?? 1;
  const nums = [input.calories, input.protein ?? 0, input.carbs ?? 0, input.fat ?? 0];
  if (!name) return { success: false, error: "Give the food a name." };
  if (nums.some((n) => !Number.isFinite(n) || n < 0) || input.calories > 5000) {
    return { success: false, error: "Check the calories and macros." };
  }
  if (!validServings(servings) || !validMeal(input.meal) || !validDate(input.consumedOn)) {
    return { success: false, error: "Invalid entry." };
  }
  const dateError = dateAllowed(input.consumedOn, false);
  if (dateError) return { success: false, error: dateError };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, error: "You must be signed in.", status: 401 };

  const snapshot: Record<string, number> = { Calories: input.calories };
  if (input.protein != null) snapshot.Protein = input.protein;
  if (input.carbs != null) snapshot["Total Carbohydrate"] = input.carbs;
  if (input.fat != null) snapshot["Total Fat"] = input.fat;

  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      item_id: null,
      item_name: name,
      serving_size: null,
      servings,
      meal_type: input.meal,
      consumed_on: input.consumedOn,
      calories_per_serving: input.calories,
      protein_g_per_serving: input.protein ?? 0,
      carbs_g_per_serving: input.carbs ?? 0,
      fat_g_per_serving: input.fat ?? 0,
      nutrition_snapshot: { ...snapshot, custom: true },
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[macro-tracker] custom insert failed", error);
    return { success: false, error: "Could not add this food." };
  }
  revalidatePath("/nutrition");
  return { success: true, data };
}

const COPY_COLUMNS =
  "item_id, item_name, serving_size, servings, meal_type, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving, nutrition_snapshot";

/** Log something again from an earlier entry (recent foods), using its saved nutrition. */
export async function relogEntry(input: {
  entryId: string;
  consumedOn: string;
  meal?: string;
}): Promise<MacroTrackerResult<FoodLogEntry>> {
  if (!UUID_REGEX.test(input.entryId) || !validDate(input.consumedOn)) {
    return { success: false, error: "Invalid entry." };
  }
  if (input.meal && !validMeal(input.meal)) return { success: false, error: "Invalid meal." };
  const dateError = dateAllowed(input.consumedOn, false);
  if (dateError) return { success: false, error: dateError };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, error: "You must be signed in.", status: 401 };

  const { data: source } = await supabase
    .from("food_logs")
    .select(COPY_COLUMNS)
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!source) return { success: false, error: "That entry no longer exists." };

  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      ...source,
      user_id: user.id,
      meal_type: input.meal ?? source.meal_type,
      consumed_on: input.consumedOn,
      is_planned: false,
    })
    .select("*")
    .single();
  if (error || !data) return { success: false, error: "Could not add this food." };
  revalidatePath("/nutrition");
  return { success: true, data };
}

/** Copy every eaten entry from one day to another (e.g. "same as yesterday"). */
export async function copyDay(input: {
  fromDate: string;
  toDate: string;
  meal?: string;
}): Promise<MacroTrackerResult<FoodLogEntry[]>> {
  if (!validDate(input.fromDate) || !validDate(input.toDate) || input.fromDate === input.toDate) {
    return { success: false, error: "Invalid dates." };
  }
  if (input.meal && !validMeal(input.meal)) return { success: false, error: "Invalid meal." };
  const dateError = dateAllowed(input.toDate, false);
  if (dateError) return { success: false, error: dateError };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, error: "You must be signed in.", status: 401 };

  let query = supabase
    .from("food_logs")
    .select(COPY_COLUMNS)
    .eq("user_id", user.id)
    .eq("consumed_on", input.fromDate)
    .eq("is_planned", false)
    .order("logged_at", { ascending: true });
  if (input.meal) query = query.eq("meal_type", input.meal);
  const { data: rows, error: readError } = await query;
  if (readError) return { success: false, error: "Could not read that day." };
  if (!rows?.length) return { success: false, error: "Nothing was logged that day." };

  const { data, error } = await supabase
    .from("food_logs")
    .insert(rows.map((r) => ({ ...r, user_id: user.id, consumed_on: input.toDate, is_planned: false })))
    .select("*");
  if (error || !data) return { success: false, error: "Could not copy that day." };
  revalidatePath("/nutrition");
  return { success: true, data };
}

/** A planned entry was eaten: count it (moving it to today if it was planned ahead). */
export async function markPlannedEaten(id: string): Promise<MacroTrackerResult<FoodLogEntry>> {
  if (!UUID_REGEX.test(id)) return { success: false, error: "Invalid entry." };
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, error: "You must be signed in.", status: 401 };

  const { data: row } = await supabase
    .from("food_logs")
    .select("consumed_on")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { success: false, error: "That entry no longer exists." };
  const today = dateInEasternTime();

  const { data, error } = await supabase
    .from("food_logs")
    .update({
      is_planned: false,
      consumed_on: row.consumed_on > today ? today : row.consumed_on,
      logged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !data) return { success: false, error: "Could not update this entry." };
  revalidatePath("/nutrition");
  return { success: true, data };
}

export type RecentFood = {
  /** Most recent entry for this food (re-log copies it). */
  entryId: string;
  name: string;
  servingSize: string | null;
  calories: number;
  protein: number;
  isCustom: boolean;
  times: number;
  lastOn: string;
};

/** Foods the user logs most, for one-tap re-logging. */
export async function getRecentFoods(): Promise<MacroTrackerResult<RecentFood[]>> {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, error: "You must be signed in.", status: 401 };

  const since = addDays(dateInEasternTime(), -60);
  const { data, error } = await supabase
    .from("food_logs")
    .select("id, item_id, item_name, serving_size, calories_per_serving, protein_g_per_serving, consumed_on, logged_at")
    .eq("user_id", user.id)
    .eq("is_planned", false)
    .gte("consumed_on", since)
    .order("logged_at", { ascending: false })
    .limit(500);
  if (error) return { success: false, error: "Could not load recent foods." };

  const byFood = new Map<string, RecentFood>();
  for (const row of data ?? []) {
    const key = `${row.item_name.trim().toLowerCase()}|${Number(row.calories_per_serving)}`;
    const hit = byFood.get(key);
    if (hit) {
      hit.times += 1;
      continue;
    }
    byFood.set(key, {
      entryId: row.id,
      name: row.item_name,
      servingSize: row.serving_size,
      calories: Number(row.calories_per_serving),
      protein: Number(row.protein_g_per_serving),
      isCustom: row.item_id == null,
      times: 1,
      lastOn: row.consumed_on,
    });
  }
  const foods = [...byFood.values()]
    .sort((a, b) => b.times - a.times || b.lastOn.localeCompare(a.lastOn))
    .slice(0, 15);
  return { success: true, data: foods };
}

export type WeekDay = { date: string; calories: number; protein: number; carbs: number; fat: number; entries: number };
export type WeekSummary = { days: WeekDay[]; streak: number };

/** The 7 days ending on `endDate` (eaten entries only), plus the logging streak to today. */
export async function getWeekSummary(endDate: string): Promise<MacroTrackerResult<WeekSummary>> {
  if (!validDate(endDate)) return { success: false, error: "Invalid date." };
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, error: "You must be signed in.", status: 401 };

  const today = dateInEasternTime();
  // Enough history for both the week shown and the streak (capped at 90 days).
  const weekStart = addDays(endDate, -6);
  const streakStart = addDays(today, -90);
  const from = weekStart < streakStart ? weekStart : streakStart;
  const { data, error } = await supabase
    .from("food_logs")
    .select("consumed_on, servings, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving")
    .eq("user_id", user.id)
    .eq("is_planned", false)
    .gte("consumed_on", from)
    .lte("consumed_on", endDate > today ? endDate : today);

  if (error) return { success: false, error: "Could not load your week." };

  const totals = new Map<string, WeekDay>();
  for (const r of data ?? []) {
    const day = totals.get(r.consumed_on) ?? { date: r.consumed_on, calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 };
    const n = Number(r.servings);
    day.calories += Number(r.calories_per_serving) * n;
    day.protein += Number(r.protein_g_per_serving) * n;
    day.carbs += Number(r.carbs_g_per_serving) * n;
    day.fat += Number(r.fat_g_per_serving) * n;
    day.entries += 1;
    totals.set(r.consumed_on, day);
  }
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(endDate, i - 6);
    return totals.get(date) ?? { date, calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 };
  });

  // Streak: consecutive days with something eaten, ending today (or yesterday
  // if today has nothing yet, so the streak doesn't look broken at breakfast).
  let streak = 0;
  let cursor = totals.has(today) ? today : addDays(today, -1);
  while (totals.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return { success: true, data: { days, streak } };
}
