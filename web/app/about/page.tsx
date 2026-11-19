import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'

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
      <p className="mt-4 text-sm text-muted-foreground">
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
