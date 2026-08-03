"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
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
  needsWizard: boolean;
  entries: FoodLogEntry[];
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
    },
  };
}

export async function logFoodItem(input: {
  itemId: string;
  servings: number;
  meal: string;
  consumedOn: string;
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

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return { success: false, error: "You must be signed in.", status: 401 };
  }

  const { data: macroSetup, error: macroSetupError } = await supabase
    .from("user_macro_goals")
    .select("setup_completed")
    .eq("user_id", user.id)
    .maybeSingle();
  if (macroSetupError) {
    console.error("[macro-tracker] setup check failed", macroSetupError);
    return { success: false, error: "Could not check your MaizeMacros setup." };
  }
  if (!macroSetup?.setup_completed) {
    return {
      success: false,
      error: "Set up MaizeMacros before logging your first item.",
      status: 428,
    };
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
