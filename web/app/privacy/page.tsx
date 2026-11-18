import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How MaizeMeals handles your data and privacy.',
}

export default function PrivacyPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Privacy Policy"
        description="A detailed privacy policy for MaizeMeals is being prepared. This page is a placeholder so sign-in and footer links work correctly."
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
