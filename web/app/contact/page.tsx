import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach the MaizeMeals project.',
}

// owner must set this address
const CONTACT_EMAIL: string = ''

const GITHUB_REPO_URL = 'https://github.com/MaizeMeals/maizemeals-app'

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 pb-12 pt-28 md:px-6">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Contact
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        MaizeMeals is a student project. Questions about the app can go to the
        owner, or you can open an issue on GitHub.
      </p>
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
    </div>
  )
}
