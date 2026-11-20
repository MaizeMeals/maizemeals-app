import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The rules for using MaizeMeals, a student-built University of Michigan dining companion.',
}

const UPDATED = 'November 20, 2026'
const GITHUB_REPO_URL = 'https://github.com/MaizeMeals/maizemeals-app'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Terms of Service"
        description={`Last updated ${UPDATED}. Continuing with Google sign-in means you agree to these terms.`}
      />

      <Section title="The service">
        <p>
          MaizeMeals helps people with a University of Michigan Google account
          look up campus dining menus, rate dishes, and track what they eat.
          It is a student project. It is not affiliated with, endorsed by, or
          sponsored by the University of Michigan. Names such as M Dining
          belong to their owners.
        </p>
        <p>
          These terms are the agreement between you and the MaizeMeals project.
          They are not a University contract.
        </p>
      </Section>

      <Section title="Who can use it">
        <p>
          Sign-in requires a @umich.edu Google account. One person per
          account. Do not share the session or use someone else’s account. We
          can refuse or end access that does not meet that rule.
        </p>
        <p>
          The product is not directed at children under 13.
        </p>
      </Section>

      <Section title="Menus, allergens, and nutrition">
        <p>
          Menus, hours, ingredients, and nutrition figures come from dining
          data feeds, including the M-Dining API and NetNutrition. They can be
          incomplete, out of date, or wrong. A dietary tag, an ingredient
          list, or an allergen line in the app is not a promise that a dish is
          safe for you.
        </p>
        <p>
          Confirm allergens and ingredients with dining staff before you eat.
          Nutrition totals and any score built from them are estimates for
          browsing, not medical, dietary, or health advice.
        </p>
      </Section>

      <Section title="Your reviews and photos">
        <p>
          You keep ownership of the text and photos you submit. You give
          MaizeMeals permission to store them, show approved photos and review
          text to other users, and keep them available with the dish they
          describe for as long as the review stays up, including after you
          delete your account.
        </p>
        <p>
          You will only post content you have the right to post. Do not post
          another person’s private information, a photo of someone who has not
          agreed to it, harassment, illegal content, or anything that pretends
          to be an official dining or University notice.
        </p>
        <p>
          Photos stay hidden until a moderator approves them. We can remove a
          review or photo that breaks these terms. You can have one review per
          dish. You can edit or delete that review.
        </p>
        <p>
          You can post a review anonymously. Other users then see
          &ldquo;Anonymous&rdquo; instead of your name and photo, but MaizeMeals
          admins can still see which account posted it. Anonymous reviews
          follow the same rules as any other review, and we can act on them
          the same way.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Do not interfere with the site, probe it for other people’s data, or
          scrape it in a way that degrades service for everyone else. Do not
          try to sign in with an account that is not yours. Do not use the
          food log or recommendations as a substitute for professional advice.
        </p>
      </Section>

      <Section title="The project’s material">
        <p>
          The MaizeMeals name, interface, and code are the project’s, except
          for open-source components and third-party data. Menu text and
          nutrition data remain subject to the dining sources they came from.
          University marks remain the University’s. You may not copy the
          product and present it as an official University service.
        </p>
      </Section>

      <Section title="Accounts end">
        <p>
          You can delete your account from Settings. That removes the sign-in
          user and the profile, food logs, macro goals, and favorites tied to
          it. Your reviews and review photos stay up, no longer linked to you,
          and are shown as &ldquo;Deleted user&rdquo; (or &ldquo;Anonymous&rdquo;
          if you posted them anonymously). Delete any reviews you don&apos;t
          want kept before deleting your account.
        </p>
        <p>
          We can suspend an account for a set time or indefinitely, or remove
          an account or a piece of content, if it breaks these terms or if we
          have to shut the student project down. A suspended account can&apos;t
          sign in or post or edit reviews.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          MaizeMeals is provided as is and as available. The project does not
          warrant that menus, hours, ingredients, allergens, nutrition numbers,
          ratings, or recommendations are accurate, complete, or fit for a
          particular diet. Use the app at your own risk.
        </p>
        <p>
          To the extent the law allows, the project and its contributors are
          not liable for lost data, missed meals, allergic reactions, or other
          damages arising from use of the app. Some places do not allow
          certain limits, and in those places the limit applies only as far as
          the law allows.
        </p>
      </Section>

      <Section title="Law">
        <p>
          These terms are governed by the laws of the State of Michigan,
          without regard to conflict-of-law rules. Disputes will be handled in
          the state or federal courts located in Washtenaw County, Michigan,
          unless a non-waivable law says otherwise.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We can update these terms. The date at the top of this page will
          change when we do. Continuing to use MaizeMeals after that date
          means you accept the update. The{' '}
          <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>{' '}
          explains what information the app stores.
        </p>
        <p>
          Questions can go to the{' '}
          <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
            contact page
          </Link>{' '}
          or the project{' '}
          <a
            href={GITHUB_REPO_URL}
            className="text-primary underline-offset-4 hover:underline"
            rel="noopener noreferrer"
          >
            GitHub repository
          </a>
          .
        </p>
      </Section>

      <p className="mt-8 text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </PageShell>
  )
}
