import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'

export const metadata: Metadata = {
  alternates: { canonical: "/faq" },
  title: 'FAQ',
  description:
    'How MaizeMeals ratings, photo approval, and dietary filters work.',
}

export default function FaqPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="FAQ"
        description="Short answers for using MaizeMeals on campus."
      />

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        How do ratings work?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Students rate items 1–5 stars with an optional comment. Averages shown
        on items come from those ratings. One review per person per item.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        Why do photos need approval?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Uploaded review photos are hidden until a moderator approves them.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        How do dietary filters work?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Vegetarian, Vegan, Halal, and Gluten-Free can be saved on your profile
        as dealbreakers. Saved dealbreakers hide non-matching items across
        dining halls and recommendations. Other chips on a hall menu, such as
        Spicy or High Protein, apply only on that page. Vegetarian also matches
        vegan items. Halal and kosher require the actual tag.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        Allergens
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Dietary tags on a menu are not a substitute for checking ingredients.
        Always confirm allergens with dining staff.
      </p>

      <p className="mt-8 text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </PageShell>
  )
}
