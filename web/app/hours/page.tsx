import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { ScheduleNoticeBanner } from "@/components/landing/ScheduleNoticeBanner";
import { JsonLd } from "@/components/seo/JsonLd";
import { getWeekHours, type Shift } from "@/lib/locations/week-hours";
import { getScheduleNotice } from "@/lib/schedule-notice-server";
import { formatClock } from "@/lib/day-menu/scoring";
import { SITE_ORIGIN } from "@/lib/site";
import { hallName } from "@/lib/seo/structured-data";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "U-M Dining Hall Hours Today & This Week | MaizeMeals",
  description:
    "Today's and this week's hours for every University of Michigan dining hall, café and market, including breakfast, lunch, dinner and break schedules.",
  alternates: { canonical: "/hours" },
};

const TYPE_LABEL: Record<string, string> = {
  "DINING HALLS": "Dining halls",
  CAFES: "Cafés",
  MARKETS: "Markets",
  GRILLS: "Grills",
};

function dayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

function shiftText(s: Shift): string {
  return `${s.name} ${formatClock(s.start)}–${formatClock(s.end)}`;
}

export default async function HoursPage() {
  const [{ dates, halls }, notice] = await Promise.all([getWeekHours(), getScheduleNotice()]);
  const groups = new Map<string, typeof halls>();
  for (const h of halls) {
    const key = TYPE_LABEL[(h.hall.type ?? "").toUpperCase()] ?? "Other locations";
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }
  const today = dates[0];
  const openToday = halls.filter((h) => (h.days[today]?.length ?? 0) > 0).length;

  return (
    <PageShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "University of Michigan dining locations",
          itemListElement: halls.map((h, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_ORIGIN}/locations/${h.hall.slug}`,
            name: hallName(h.hall),
          })),
        }}
      />
      <PageHeader
        title="Dining hours"
        description={`Posted hours for every U-M dining hall, café and market. ${openToday} of ${halls.length} locations have hours posted for today.`}
      />
      {notice ? (
        <div className="-mx-4 mt-2">
          <ScheduleNoticeBanner notice={notice} />
        </div>
      ) : null}

      {[...groups.entries()].map(([group, list]) => (
        <section key={group} aria-labelledby={`hours-${group}`} className="mt-8">
          <h2 id={`hours-${group}`} className="font-heading text-xl font-bold text-umich-blue dark:text-white">
            {group}
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
            {list.map(({ hall, days }) => {
              const todays = days[today] ?? [];
              return (
                <li key={hall.id} className="p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link href={`/locations/${hall.slug}`} className="font-semibold text-foreground hover:underline">
                      {hallName(hall)}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {todays.length ? todays.map(shiftText).join(" · ") : "No hours posted today"}
                    </span>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">This week</summary>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
                      {dates.slice(1).map((date, i) => (
                        <div key={date} className="contents">
                          <dt className="font-medium text-foreground">{dayLabel(date, i + 1)}</dt>
                          <dd className="text-muted-foreground">
                            {days[date]?.length ? days[date].map(shiftText).join(" · ") : "No hours posted"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="mt-8 text-sm text-muted-foreground">
        Hours come from Michigan Dining and update nightly. MaizeMeals is unofficial; check{" "}
        <a href="https://dining.umich.edu/" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
          dining.umich.edu
        </a>{" "}
        for last-minute changes.
      </p>
    </PageShell>
  );
}
