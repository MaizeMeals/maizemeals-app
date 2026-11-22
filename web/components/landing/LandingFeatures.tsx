import { Ban, Flame, Search, Utensils } from "lucide-react"
import { DietaryTag } from "@/components/locations/slug/DietaryTags"
import { FoodIcon } from "@/components/ingredients/FoodIcon"
import { ADDITIVE_CATEGORIES, type AdditiveCategory } from "@/lib/ingredients"
import { cn } from "@/lib/utils"

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
      <div className="flex min-h-44 flex-col justify-center gap-4 rounded-2xl bg-muted/50 p-4 lg:h-60" aria-hidden>
        {children}
      </div>
      <h3 className="font-heading text-lg font-bold text-umich-blue dark:text-white">{title}</h3>
      <p className="text-[15px] leading-relaxed text-muted-foreground">{body}</p>
    </article>
  )
}

function Bar({ icon: Icon, label, value, goal, unit, tone }: {
  icon: typeof Flame
  label: string
  value: number
  goal: number
  unit: string
  tone: "orange" | "rose"
}) {
  const color = tone === "orange" ? "text-orange-500 bg-orange-50 dark:bg-orange-500/15" : "text-rose-500 bg-rose-50 dark:bg-rose-500/15"
  const bar = tone === "orange" ? "bg-orange-500" : "bg-rose-500"
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 text-[13px]">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", color)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 font-semibold">{label}</span>
        <span className="font-bold tabular-nums">
          {value.toLocaleString()} <span className="font-medium text-muted-foreground">/ {goal.toLocaleString()}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-border">
        <div className={cn("h-2 rounded-full", bar)} style={{ width: `${Math.round((value / goal) * 100)}%` }} />
      </div>
    </div>
  )
}

function Flagged({ text, category }: { text: string; category: AdditiveCategory }) {
  const c = ADDITIVE_CATEGORIES[category]
  return (
    <span className={cn("whitespace-nowrap rounded-md py-0.5 pl-1.5 pr-1", c.mark)}>
      {text}{" "}
      <span className={cn("ml-0.5 rounded-full px-1.5 py-px text-[10px] font-bold text-white", c.dot)}>{c.label}</span>
    </span>
  )
}

const SEARCH_RESULTS = [
  { name: "Turkey Burger", hall: "South Quad" },
  { name: "Italian Turkey Burger", hall: "Wolverine Village" },
  { name: "Beef & Mushroom Burger", hall: "Bursley" },
]

/** "More than a menu": four product snapshots for first-time visitors. */
export function LandingFeatures() {
  return (
    <section aria-labelledby="features-heading" className="mt-14 bg-muted/40 py-16 md:mt-20 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="features-heading" className="text-center font-heading text-2xl font-bold text-umich-blue dark:text-white md:text-3xl">
          More than a menu
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground md:text-lg">
          What students use MaizeMeals for, beyond checking what&apos;s for dinner.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Macro tracking" body="Log any dish in two taps and see what's still being served that fits the calories and protein you have left.">
            <Bar icon={Flame} label="Calories" value={1480} goal={2200} unit="" tone="orange" />
            <Bar icon={Utensils} label="Protein" value={112} goal={150} unit=" g" tone="rose" />
          </Card>

          <Card title="Know what's in it" body="Full ingredient lists with seed oils, preservatives and other additives tagged.">
            <p className="text-[13px] leading-[2.2] text-foreground/80">
              Enriched Flour, Water, <Flagged text="Oil Canola" category="seed_oil" />, Sugar, Salt,{" "}
              <Flagged text="Soy Lecithin" category="emulsifier" />, <Flagged text="Calcium Propionate" category="preservative" />, Yeast
            </p>
          </Card>

          <Card title="Eat around allergies" body="Hide dishes with the allergens and additives you avoid, or show only what fits your diet, across every hall at once.">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {["Peanuts", "Sesame"].map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <Ban className="h-3 w-3" /> {a}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <span className={cn("h-2 w-2 rounded-full", ADDITIVE_CATEGORIES.seed_oil.dot)} /> Seed oils
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Show only</p>
              <div className="flex flex-wrap gap-1.5">
                {["vegan", "glutenfree", "halal", "highprotein"].map((t) => (
                  <DietaryTag key={t} tag={t} alwaysShowLabel />
                ))}
              </div>
            </div>
          </Card>

          <Card title="Find a dish anywhere" body="Search one dish across every hall and café, then see where and when it's served.">
            <div className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[13px]">
              <Search className="h-3.5 w-3.5 text-muted-foreground" /> burger
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
              {SEARCH_RESULTS.map((r) => (
                <li key={r.name} className="flex items-center gap-2.5 px-2.5 py-2">
                  <FoodIcon name="burger" className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">{r.hall} · Dinner</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  )
}

/** Desktop only: how to put the site on a phone's home screen. */
export function InstallSteps() {
  return (
    <section aria-labelledby="install-heading" className="mx-auto hidden max-w-6xl px-4 pt-16 md:block">
      <div className="flex flex-wrap items-center gap-10 rounded-3xl bg-umich-blue p-10 text-white lg:p-12">
        <div className="min-w-[320px] flex-1 space-y-3">
          <h2 id="install-heading" className="font-serif text-4xl leading-tight lg:text-5xl">
            Put MaizeMeals on your <span className="text-maize">phone&apos;s home screen</span>.
          </h2>
          <p className="text-lg text-white/80">It opens like an app, full screen and fast. No app store needed.</p>
        </div>
        <div className="grid min-w-[320px] flex-1 grid-cols-2 gap-4">
          {[
            { os: "iPhone", steps: ["Open maizemeals.com in Safari", "Tap Share", "Add to Home Screen"] },
            { os: "Android", steps: ["Open maizemeals.com in Chrome", "Tap the ⋮ menu", "Install app"] },
          ].map(({ os, steps }) => (
            <div key={os} className="rounded-2xl border border-white/20 bg-white/10 p-5">
              <h3 className="mb-2 font-heading font-semibold">{os}</h3>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-white/85">
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
