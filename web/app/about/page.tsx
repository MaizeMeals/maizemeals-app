import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { PageHeader, PageShell } from '@/components/layout/page-shell'
import { ObfuscatedEmail } from '@/components/about/ObfuscatedEmail'
import { TEAM } from '@/lib/team'

export const metadata: Metadata = {
  title: 'About',
  description:
    'MaizeMeals is a student-built dining companion for University of Michigan students.',
}

export default function AboutPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="About"
        description="MaizeMeals is a student-built dining companion for University of Michigan students. It helps you look up dining hall menus, rate dishes, and keep track of what you want to eat on campus."
      />
      <section aria-labelledby="team-heading" className="mt-6">
        <h2 id="team-heading" className="text-lg font-semibold text-foreground">
          Who we are
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Two University of Michigan students who wanted a better way to decide where to eat.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {TEAM.map((person) => (
            <li key={person.uniqname} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <Image
                  src={person.photo}
                  alt={`Photo of ${person.name}`}
                  width={72}
                  height={72}
                  className="h-18 w-18 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{person.name}</p>
                  <p className="text-sm text-muted-foreground">{person.role}</p>
                </div>
              </div>
              <ObfuscatedEmail user={person.uniqname} className="mt-3" />
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        This application is a student project and is not affiliated with,
        endorsed by, or sponsored by the University of Michigan. Trademarks
        including M Dining belong to their owners.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Menu data comes from the M-Dining JSON API, not from an official
        partnership. It may be incomplete or wrong.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Ingredients and allergens come from U-M NetNutrition. Additive
        highlights use the{" "}
        <a
          href="https://world.openfoodfacts.org/"
          className="text-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Open Food Facts
        </a>{" "}
        additives database, available under the{" "}
        <a
          href="https://opendatacommons.org/licenses/odbl/1-0/"
          className="text-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Open Database License
        </a>
        . Always confirm allergens with dining staff.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Food illustrations are{" "}
        <a
          href="https://github.com/microsoft/fluentui-emoji"
          className="text-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Fluent Emoji
        </a>{" "}
        by Microsoft, used under the MIT License.
      </p>
      <p className="mt-8 text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </PageShell>
  )
}
