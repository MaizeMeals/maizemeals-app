import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Droplet, Flame, Lock, Search, Sparkles, Target, Utensils, Wheat } from "lucide-react";
import { getMacroTrackerDay } from "@/app/actions/macro-tracker";
import { MacroTracker } from "@/components/nutrition/MacroTracker";
import { ProgressCard } from "@/components/nutrition/ProgressCard";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { dateInEasternTime, DEFAULT_NUTRITION_GOALS } from "@/lib/nutrition";
import { appPrimaryButtonClassName } from "@/lib/button-styles";

export const metadata: Metadata = {
  alternates: { canonical: "/nutrition" },
  title: "U-M Dining Hall Calories & Macro Tracker | MaizeMeals",
  description: "Track calories and macros from the dining hall menus you actually eat.",
};

const POINTS = [
  { icon: Search, text: "Log any dish from campus menus in two taps, or add your own food." },
  { icon: Sparkles, text: "See which dishes still being served fit the calories and protein you have left." },
  { icon: Target, text: "Personal targets from a quick estimate (cut, maintain, or bulk)." },
  { icon: CalendarClock, text: "Plan tomorrow's meals and track your week and streak." },
  { icon: Lock, text: "Your food log is private to your account. Export it any time." },
];

/** What signed-out visitors see instead of a login wall. */
function MacrosPreview() {
  return (
    <PageShell className="min-h-screen bg-muted/20 pb-16">
      <PageHeader title="MaizeMacros" description="Track calories and macros from the dining hall menus you actually eat." />
      <div className="mt-6 grid grid-cols-2 gap-3 opacity-90 lg:grid-cols-4" aria-hidden>
        <ProgressCard label="Calories" value={1480} goal={2200} unit="" spokenUnit="calories" icon={Flame} barClass="bg-orange-500" iconClass="text-orange-500" />
        <ProgressCard label="Protein" value={112} goal={150} unit="g" spokenUnit="grams" icon={Utensils} barClass="bg-rose-500" iconClass="text-rose-500" kind="goal" />
        <ProgressCard label="Carbs" value={160} goal={240} unit="g" spokenUnit="grams" icon={Wheat} barClass="bg-amber-500" iconClass="text-amber-500" />
        <ProgressCard label="Fat" value={48} goal={70} unit="g" spokenUnit="grams" icon={Droplet} barClass="bg-blue-500" iconClass="text-blue-500" />
      </div>
      <ul className="mt-8 space-y-3">
        {POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-maize" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className={appPrimaryButtonClassName}>
          <Link href="/login?next=%2Fnutrition">Sign in to start</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/menus">Browse menus</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; edit?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <MacrosPreview />;

  const today = dateInEasternTime();
  const initial = await getMacroTrackerDay(today);
  const params = await searchParams;
  const requestedReturnTo = params.return_to;
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
              itemAdditives: {},
            }
      }
      initialError={initial.success ? null : initial.error}
      returnTo={returnTo}
      startEditing={params.edit === "targets"}
    />
  );
}
