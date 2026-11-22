import Link from "next/link";
import { LandingHero } from "@/components/landing/LandingHero";
import { ScheduleNoticeBanner } from "@/components/landing/ScheduleNoticeBanner";
import { FavoritesToday, GoodRightNow } from "@/components/landing/LandingMenus";
import { OpenNow } from "@/components/landing/OpenNow";
import { TodayMacros } from "@/components/landing/TodayMacros";
import { InstallSteps, LandingFeatures } from "@/components/landing/LandingFeatures";
import { getMacroTrackerDay } from "@/app/actions/macro-tracker";
import { createClient } from "@/lib/supabase/server";
import { getScheduleNotice } from "@/lib/schedule-notice-server";
import { dateInEasternTime } from "@/lib/nutrition";

function firstNameOf(meta: Record<string, unknown> | undefined): string | null {
  const full = typeof meta?.full_name === "string" ? meta.full_name : typeof meta?.name === "string" ? meta.name : "";
  const first = full.trim().split(/\s+/)[0];
  return first || null;
}

export default async function Home() {
  const supabase = await createClient();
  const [{ data: auth }, notice] = await Promise.all([supabase.auth.getUser(), getScheduleNotice()]);
  const user = auth.user;
  const signedIn = Boolean(user);
  const firstName = user ? firstNameOf(user.user_metadata) ?? "there" : null;

  // Today's macros, only when something has been eaten (not just planned).
  let macros: { eaten: { calories: number; protein: number }; goals: { calories: number; protein: number } } | null = null;
  if (user) {
    const day = await getMacroTrackerDay(dateInEasternTime());
    if (day.success) {
      const eaten = day.data.entries
        .filter((e) => !e.is_planned)
        .reduce(
          (sum, e) => ({
            calories: sum.calories + Number(e.calories_per_serving) * Number(e.servings),
            protein: sum.protein + Number(e.protein_g_per_serving) * Number(e.servings),
          }),
          { calories: 0, protein: 0 },
        );
      if (eaten.calories > 0) {
        macros = { eaten, goals: { calories: day.data.goals.calories, protein: day.data.goals.protein } };
      }
    }
  }
  const remaining = macros
    ? { calories: macros.goals.calories - macros.eaten.calories, protein: macros.goals.protein - macros.eaten.protein }
    : null;

  return (
    <div className="min-h-screen pb-10">
      <LandingHero firstName={firstName} />
      {notice ? <ScheduleNoticeBanner notice={notice} /> : null}
      {macros ? <TodayMacros eaten={macros.eaten} goals={macros.goals} /> : null}
      <FavoritesToday />
      <GoodRightNow remaining={remaining} />
      <OpenNow />
      {!signedIn ? (
        <>
          <LandingFeatures />
          <InstallSteps />
        </>
      ) : null}
      <p className="mx-auto mt-12 max-w-6xl px-4 text-center text-sm text-muted-foreground">
        Built by two U-M students · Unofficial, not affiliated with Michigan Dining · Menus update nightly ·{" "}
        <Link href="/about" className="font-semibold text-foreground hover:underline">
          Meet the team
        </Link>
      </p>
    </div>
  );
}
