import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'MaizeMeals terms of service for University of Michigan students.',
}

export default function TermsPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Terms of Service"
        description="Full legal terms for MaizeMeals are being prepared. This page is a placeholder so sign-in and footer links work correctly."
      />
      <p className="text-sm text-muted-foreground">
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
    </PageShell>
  )
}
