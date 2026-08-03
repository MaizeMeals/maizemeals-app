import type { Json } from "@/types/supabase";

export type MacroSummary = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const MACRO_GOAL_TYPES = ["CUT", "MAINTAIN", "BULK"] as const;
export type MacroGoalType = (typeof MACRO_GOAL_TYPES)[number];

export const ACTIVITY_LEVELS = [
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "VERY_ACTIVE",
  "ATHLETE",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const BIOLOGICAL_SEX_OPTIONS = ["FEMALE", "MALE", "UNSPECIFIED"] as const;
export type BiologicalSex = (typeof BIOLOGICAL_SEX_OPTIONS)[number];

export type MacroProfileInput = {
  heightCm: number;
  weightKg: number;
  age: number;
  activityLevel: ActivityLevel;
  biologicalSex: BiologicalSex;
  goalType: MacroGoalType;
};

export type MacroTargetInput = {
  goals: MacroSummary;
  goalType: MacroGoalType;
};

export type CalculatedMacroTargets = {
  estimatedTdee: number;
  goals: MacroSummary;
};

export const DEFAULT_NUTRITION_GOALS: MacroSummary = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

function finiteNonnegative(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function macroSummaryFromNutrition(
  nutrition: Json | null | undefined,
): MacroSummary {
  const record =
    nutrition && typeof nutrition === "object" && !Array.isArray(nutrition)
      ? nutrition
      : {};

  return {
    calories: finiteNonnegative(record["Calories"]),
    protein: finiteNonnegative(record["Protein"]),
    carbs: finiteNonnegative(record["Total Carbohydrate"]),
    fat: finiteNonnegative(record["Total Fat"]),
  };
}

export function scaleMacros(macros: MacroSummary, servings: number): MacroSummary {
  const multiplier = finiteNonnegative(servings);
  return {
    calories: macros.calories * multiplier,
    protein: macros.protein * multiplier,
    carbs: macros.carbs * multiplier,
    fat: macros.fat * multiplier,
  };
}

export function addMacros(a: MacroSummary, b: MacroSummary): MacroSummary {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

export function dateInEasternTime(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function suggestedMeal(date = new Date()): FoodLogMeal {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/New_York",
    }).format(date),
  );

  if (hour < 10) return "BREAKFAST";
  if (hour < 15) return "LUNCH";
  if (hour < 21) return "DINNER";
  return "SNACK";
}

export const FOOD_LOG_MEALS = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
  "OTHER",
] as const;

export type FoodLogMeal = (typeof FOOD_LOG_MEALS)[number];

export function foodLogMealLabel(meal: FoodLogMeal): string {
  return meal.charAt(0) + meal.slice(1).toLowerCase();
}

export function menuMealToFoodLogMeal(meal: string | null | undefined): FoodLogMeal {
  const normalized = meal?.trim().toUpperCase();
  return (FOOD_LOG_MEALS as readonly string[]).includes(normalized ?? "")
    ? (normalized as FoodLogMeal)
    : suggestedMeal();
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  VERY_ACTIVE: 1.725,
  ATHLETE: 1.9,
};

const GOAL_CALORIE_MULTIPLIERS: Record<MacroGoalType, number> = {
  CUT: 0.8,
  MAINTAIN: 1,
  BULK: 1.15,
};

/** Mifflin-St Jeor BMR followed by standard activity multipliers. */
export function calculateMacroTargets(input: MacroProfileInput): CalculatedMacroTargets {
  const sexConstant =
    input.biologicalSex === "MALE"
      ? 5
      : input.biologicalSex === "FEMALE"
        ? -161
        : -78;
  const bmr =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexConstant;
  const estimatedTdee = Math.max(
    1200,
    Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]),
  );

  const targetCalories = Math.max(
    1200,
    Math.round(estimatedTdee * GOAL_CALORIE_MULTIPLIERS[input.goalType]),
  );
  const proteinPerKg = input.goalType === "MAINTAIN" ? 1.6 : 1.8;
  const protein = Math.round(input.weightKg * proteinPerKg);
  const fat = Math.round((targetCalories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((targetCalories - protein * 4 - fat * 9) / 4));

  return {
    estimatedTdee,
    goals: { calories: targetCalories, protein, carbs, fat },
  };
}
