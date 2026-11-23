import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqJsonLd, hallName } from '@/lib/seo/structured-data'
import { getWeekHours } from '@/lib/locations/week-hours'
import { getDayMenu } from '@/lib/day-menu/server'
import { isDiningHall } from '@/lib/day-menu/match'
import { easternToday } from '@/lib/day-menu/scoring'
import { normalizeDietaryTag } from '@/lib/filter-utils'
import { shortHallName } from '@/lib/schedule-notice'

export const revalidate = 3600

export const metadata: Metadata = {
  alternates: { canonical: "/faq" },
  title: 'U-M Dining FAQ: Hours, Halal & Vegan Food, Allergens | MaizeMeals',
  description:
    'Answers about University of Michigan dining halls: weekend hours, where to find halal, vegan and gluten-free food, allergens, and how MaizeMeals works.',
}

type Faq = { q: string; a: string; links?: { href: string; label: string }[] }

function listNames(names: string[], max = 8): string {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  if (shown.length === 0) return ''
  const body = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
  return rest > 0 ? `${body}, plus ${rest} more` : body
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}

async function buildFaqs(): Promise<Faq[]> {
  const [{ dates, halls }, menu] = await Promise.all([
    getWeekHours().catch(() => ({ dates: [] as string[], halls: [] })),
    getDayMenu(easternToday()).catch(() => null),
  ])

  // Weekend: dining halls with posted hours on the coming Saturday or Sunday.
  const weekend = dates.filter((d) => [0, 6].includes(weekdayOf(d)))
  const diningHalls = halls.filter((h) => (h.hall.type ?? '').toUpperCase() === 'DINING HALLS')
  const openWeekend = diningHalls
    .filter((h) => weekend.some((d) => (h.days[d]?.length ?? 0) > 0))
    .map((h) => shortHallName(hallName(h.hall)))
  const weekendAnswer = weekend.length === 0 || openWeekend.length === 0
    ? 'Weekend hours are posted a few days ahead. Most dining halls serve brunch and dinner on Saturdays and Sundays; the Hours page shows exactly what is posted.'
    : `This weekend, ${listNames(openWeekend)} have posted hours. Dining halls usually serve brunch and dinner on Saturdays and Sundays instead of breakfast and lunch.`

  // Today's menus: which dining halls list halal / vegan / gluten-free dishes.
  const hallsWith = (tag: string) => {
    if (!menu) return []
    const ids = new Set(menu.items.filter((it) => it.tags.map(normalizeDietaryTag).includes(tag)).map((it) => it.hallId))
    return menu.halls.filter((h) => ids.has(h.id) && isDiningHall(h)).map((h) => shortHallName(h.name))
  }
  const halal = hallsWith('halal')
  const vegan = hallsWith('vegan')
  const glutenFree = hallsWith('glutenfree')
  const today = (names: string[], what: string) =>
    names.length ? `Today, ${listNames(names)} list ${what} dishes.` : `No dining hall lists ${what} dishes today yet.`

  return [
    {
      q: 'Which U-M dining halls are open right now?',
      a: 'The Hours page lists today’s and this week’s posted hours for every dining hall, café and market, and the home page shows what is open now. MaizeMeals also flags breaks, such as Thanksgiving, when only some locations open.',
      links: [{ href: '/hours', label: 'Dining hours' }, { href: '/', label: 'Open now' }],
    },
    {
      q: 'Which dining halls are open on weekends?',
      a: weekendAnswer,
      links: [{ href: '/hours', label: 'Weekend hours' }],
    },
    {
      q: 'Where can I find halal food on campus?',
      a: `${today(halal, 'halal')} Turn on the Halal filter in Find food or on any dining hall menu to see only halal-tagged dishes.`,
      links: [{ href: '/menus', label: 'Find food' }],
    },
    {
      q: 'Where can I find vegan or vegetarian food?',
      a: `${today(vegan, 'vegan')} The Vegan and Vegetarian filters work across every dining hall at once, and vegetarian also includes vegan dishes.`,
      links: [{ href: '/menus', label: 'Find food' }],
    },
    {
      q: 'Can I find gluten-free food in the dining halls?',
      a: `${today(glutenFree, 'gluten-free')} Use the Gluten Free filter, and always confirm with dining staff if you have celiac disease or a serious allergy.`,
    },
    {
      q: 'How do I search for a specific dish?',
      a: 'Find food searches every dish on today’s menus. Type something like "burger" or "tempeh" to see which dining halls serve it, at which meal, and how students rated it.',
      links: [{ href: '/menus', label: 'Find food' }],
    },
    {
      q: 'Does MaizeMeals show ingredients and allergens?',
      a: 'Yes, when U-M publishes them on NetNutrition. Ingredient lists highlight seed oils, preservatives and other additives, and the Avoid filters hide dishes that list an allergen you choose. Labels can be missing or change, so always confirm allergens with dining hall staff.',
    },
    {
      q: 'Can I track calories and protein from the dining halls?',
      a: 'Yes. Sign in with your @umich.edu account and log any dish in two taps. Macro tracking shows calories, protein, carbs and fat for the day and suggests dishes still being served that fit what you have left.',
      links: [{ href: '/nutrition', label: 'Macro tracking' }],
    },
    {
      q: 'How do ratings work?',
      a: 'Students rate dishes 1–5 stars with an optional comment and photo. Ratings are per dining hall, so the pizza at one hall is rated separately from the pizza at another. One review per person per dish, and reviews can be posted anonymously.',
    },
    {
      q: 'Why do photos need approval?',
      a: 'Uploaded review photos stay hidden until a moderator approves them.',
    },
    {
      q: 'How do dietary filters work?',
      a: 'Vegetarian, Vegan, Halal and Gluten-Free can be saved on your profile as dealbreakers, which hide non-matching dishes everywhere. Other chips, such as Spicy or High Protein, apply only to the page you are on. Vegetarian also matches vegan dishes; Halal and Kosher require the actual tag.',
    },
    {
      q: 'Can I add MaizeMeals to my phone like an app?',
      a: 'Yes. On iPhone, open maizemeals.com in Safari, tap Share, then Add to Home Screen. On Android, open it in Chrome, tap the ⋮ menu, then Install app.',
    },
    {
      q: 'Is MaizeMeals official?',
      a: 'No. MaizeMeals is built by two University of Michigan students and is not affiliated with Michigan Dining. Menus and hours come from Michigan Dining and update nightly.',
      links: [{ href: '/about', label: 'About us' }],
    },
  ]
}

export default async function FaqPage() {
  const faqs = await buildFaqs()

  return (
    <PageShell width="narrow">
      <JsonLd data={faqJsonLd(faqs)} />
      <PageHeader title="FAQ" description="Short answers about U-M dining and using MaizeMeals." />

      {faqs.map((f) => (
        <section key={f.q}>
          <h2 className="mt-8 text-lg font-semibold text-foreground">{f.q}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          {f.links?.length ? (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {f.links.map((l) => (
                <Link key={l.href} href={l.href} className="font-medium text-primary underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              ))}
            </p>
          ) : null}
        </section>
      ))}

      <p className="mt-10 text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </PageShell>
  )
}
