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
      <p className="mt-8 text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </PageShell>
  )
}
