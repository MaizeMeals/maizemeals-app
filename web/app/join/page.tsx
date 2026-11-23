import type { Metadata } from "next";
import Link from "next/link";
import { Code2, Database, Megaphone, Palette, Mail } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { EmailButton, ObfuscatedEmail } from "@/components/about/ObfuscatedEmail";
import { getLocationDirectory } from "@/lib/locations/directory";
import { getDayMenu } from "@/lib/day-menu/server";
import { easternToday } from "@/lib/day-menu/scoring";
import { TEAM } from "@/lib/team";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Join the MaizeMeals Team | U-M Student Project",
  description:
    "Help build MaizeMeals, the student-made guide to U-M dining. We're looking for University of Michigan students in development, data, design and growth.",
  alternates: { canonical: "/join" },
};

const ROLES = [
  {
    icon: Code2,
    title: "Frontend developer",
    body: "Build the screens students use every day: menus, search, the item sheet, macro tracking. Mobile-first, fast, accessible.",
    skills: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
  },
  {
    icon: Database,
    title: "Backend & data",
    body: "Keep menus, hours and ingredient labels accurate: the nightly scraper, the database, and features like recommendations and break notices.",
    skills: ["Python", "PostgreSQL", "Supabase", "SQL"],
  },
  {
    icon: Palette,
    title: "Product & UI/UX design",
    body: "Talk to students, find what's confusing, and design what we build next, from quick fixes to whole new features.",
    skills: ["Figma", "User research", "Prototyping", "Design systems"],
  },
  {
    icon: Megaphone,
    title: "Marketing & growth",
    body: "Get MaizeMeals in front of students: campus partnerships, social media, dorm outreach, and figuring out what makes people come back.",
    skills: ["Content", "Social media", "Analytics", "Campus outreach"],
  },
];

const WHY = [
  "Ship code real students use for their meals every day.",
  "Work across the whole stack, from scraping data to the UI, with code review on everything.",
  "Pick what you work on and how much time you put in.",
  "Something concrete to show for internships and interviews.",
];

const SUBJECT = "Joining MaizeMeals";
const BODY = "Hi! I'm interested in working on MaizeMeals.\n\nName:\nYear and major:\nRole(s) I'm interested in:\nWhat I've built or worked on (links welcome):\n";

export default async function JoinPage() {
  const [halls, menu] = await Promise.all([
    getLocationDirectory().catch(() => []),
    getDayMenu(easternToday()).catch(() => null),
  ]);
  const lead = TEAM[0];

  return (
    <PageShell>
      <section className="pt-4 text-center">
        <p className="text-sm font-semibold text-maize">U-M students only</p>
        <h1 className="mt-2 font-serif text-5xl leading-tight text-umich-blue dark:text-white md:text-6xl">
          Help build <span className="text-maize">MaizeMeals</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          We&apos;re a small team of Michigan students making the dining hall guide we always wanted. If you want to build
          something your friends actually use, we&apos;d love to hear from you.
        </p>
        <div className="mt-6 flex justify-center">
          <EmailButton
            user={lead.uniqname}
            subject={SUBJECT}
            body={BODY}
            className={cn(
              "inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-base",
              appPrimaryButtonClassName,
            )}
          >
            <Mail className="h-5 w-5" aria-hidden /> Email us to join
          </EmailButton>
        </div>
      </section>

      <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 text-center">
        {[
          { value: halls.length || "26", label: "Dining locations" },
          { value: menu ? menu.items.length.toLocaleString() : "1,000+", label: "Dishes on today's menus" },
          { value: TEAM.length, label: "Students on the team" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col-reverse rounded-2xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground md:text-sm">{s.label}</dt>
            <dd className="font-heading text-2xl font-bold text-umich-blue dark:text-white md:text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="roles-heading" className="mt-14">
        <h2 id="roles-heading" className="font-heading text-2xl font-bold text-umich-blue dark:text-white">
          Roles
        </h2>
        <p className="mt-1 text-muted-foreground">
          No title or experience level required. Tell us what you&apos;re interested in.
        </p>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {ROLES.map(({ icon: Icon, title, body, skills }) => (
            <li key={title} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maize/15 text-umich-blue dark:text-maize">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
                {skills.map((skill) => (
                  <li key={skill} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground/80">
                    {skill}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why-heading" className="mt-14">
        <h2 id="why-heading" className="font-heading text-2xl font-bold text-umich-blue dark:text-white">
          Why join
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {WHY.map((line) => (
            <li key={line} className="flex gap-3 rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maize" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="apply-heading"
        className="mt-14 rounded-3xl bg-umich-blue p-8 text-white md:p-10"
      >
        <h2 id="apply-heading" className="font-serif text-3xl leading-tight md:text-4xl">
          Interested? <span className="text-maize">Send us an email.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-white/85">
          Use your @umich.edu address and include your year and major, the role you&apos;re interested in, and anything
          you&apos;ve built (a GitHub, a portfolio, a class project). No résumé needed. We&apos;ll get back to you.
        </p>
        <div className="mt-5 rounded-2xl bg-white p-4 text-foreground dark:bg-background">
          <p className="mb-2 text-sm font-semibold">
            {lead.name}, {lead.role}
          </p>
          <ObfuscatedEmail user={lead.uniqname} subject={SUBJECT} body={BODY} />
        </div>
      </section>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Want to know who we are first?{" "}
        <Link href="/about" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Meet the team
        </Link>
      </p>
    </PageShell>
  );
}
