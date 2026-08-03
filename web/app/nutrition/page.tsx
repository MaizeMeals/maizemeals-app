import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMacroTrackerDay } from "@/app/actions/macro-tracker";
import { MacroTracker } from "@/components/nutrition/MacroTracker";
import { createClient } from "@/lib/supabase/server";
import { dateInEasternTime, DEFAULT_NUTRITION_GOALS } from "@/lib/nutrition";

export const metadata: Metadata = {
  title: "Macro Tracker | MaizeMeals",
  description: "Track daily calories, protein, carbohydrates, and fat from campus meals.",
};

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=%2Fnutrition");

  const today = dateInEasternTime();
  const initial = await getMacroTrackerDay(today);
  const requestedReturnTo = (await searchParams).return_to;
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : null;

  return (
    <MacroTracker
      initialDate={today}
      initialData={
        initial.success
          ? initial.data
          : {
              goals: DEFAULT_NUTRITION_GOALS,
              goalSettings: null,
              needsWizard: true,
              entries: [],
            }
      }
      initialError={initial.success ? null : initial.error}
      returnTo={returnTo}
    />
  );
}
