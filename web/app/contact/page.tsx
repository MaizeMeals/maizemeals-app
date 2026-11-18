import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach the MaizeMeals project.',
}

// owner must set this address
const CONTACT_EMAIL: string = ''

const GITHUB_REPO_URL = 'https://github.com/MaizeMeals/maizemeals-app'

export default function ContactPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Contact"
        description="MaizeMeals is a student project. Questions about the app can go to the owner, or you can open an issue on GitHub."
      />
      {CONTACT_EMAIL ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          The project owner still needs to add a contact email address.
        </p>
      )}
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
