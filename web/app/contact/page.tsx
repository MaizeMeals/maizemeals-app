import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'
import { ObfuscatedEmail } from '@/components/about/ObfuscatedEmail'
import { TEAM } from '@/lib/team'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach the MaizeMeals project.',
}

const GITHUB_REPO_URL = 'https://github.com/MaizeMeals/maizemeals-app'

export default function ContactPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Contact"
        description="MaizeMeals is a student project. Questions about the app can go to us by email, or you can open an issue on GitHub."
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Questions, bug reports, or a review that should come down: email {TEAM[0].name}.
      </p>
      <ObfuscatedEmail user={TEAM[0].uniqname} className="mt-2" />
      <p className="mt-4 text-sm text-muted-foreground">
        You can also reach the project on{' '}
        <a
          href={GITHUB_REPO_URL}
          className="text-primary underline-offset-4 hover:underline"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        .
      </p>
      <p className="mt-8 text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </PageShell>
  )
}
