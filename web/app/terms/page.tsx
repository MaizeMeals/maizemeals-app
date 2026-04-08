import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'MaizeMeals terms of service for University of Michigan students.',
}

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 md:px-6">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Full legal terms for MaizeMeals are being prepared. This page is a
        placeholder so sign-in and footer links work correctly.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Questions?{' '}
        <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
          Contact us
        </Link>
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
