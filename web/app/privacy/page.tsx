import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What MaizeMeals collects, who can see it, and how to delete your account.',
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

export default function PrivacyPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Privacy Policy"
        description={`Last updated ${UPDATED}. This policy describes the MaizeMeals student project. It is not a University of Michigan policy.`}
      />

      <Section title="Who we are">
        <p>
          MaizeMeals is a student-built dining companion for people with a
          University of Michigan Google account. It is not affiliated with,
          endorsed by, or sponsored by the University of Michigan. Menu data
          comes from public dining sources, including the M-Dining API and
          NetNutrition. Those sources are not a partnership.
        </p>
        <p>
          Questions about this policy can go to the{' '}
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

      <Section title="Accounts">
        <p>
          Sign-in is Google OAuth, limited to @umich.edu addresses. We receive
          the account identifier Google gives the sign-in provider, your email
          address, a shortened display name (such as “Jane D.”), and your
          Google profile photo if Google provides one. The part of the email
          before @ is stored as a uniqname. The email address is not shown on
          public reviews. The shortened name and photo can appear next to
          reviews you post, unless you post the review anonymously.
        </p>
        <p>
          Accounts that are not @umich.edu are signed out and not kept.
        </p>
      </Section>

      <Section title="What you add">
        <p>
          If you rate a dish, we store the star rating, an optional comment,
          and the item it belongs to. You can post one review per item. Review
          text is visible to other people using MaizeMeals.
        </p>
        <p>
          If you post anonymously, other people see &ldquo;Anonymous&rdquo;
          instead of your name and photo. MaizeMeals admins can still see which
          account posted it, for moderation.
        </p>
        <p>
          Photos you attach are stored until a moderator approves them. Until
          then they are not shown on the public item. Approved photos are
          visible with the review.
        </p>
        <p>
          Saved dealbreakers (vegetarian, vegan, halal, gluten-free),
          recommendation sliders, favorite dining halls, favorite dishes, and
          onboarding state are stored on your profile when you are signed in.
          Food logs and macro targets stay on your account. Other people do
          not see your food log.
        </p>
        <p>
          Before you sign in, dietary preferences and favorite dishes can sit
          in this browser’s local storage. Signing in copies those guest
          preferences onto your account. Dismissed tips are also remembered in
          local storage on that device.
        </p>
      </Section>

      <Section title="Analytics">
        <p>
          When a PostHog project key is configured, MaizeMeals records product
          analytics: page views, feature events (such as opening a menu or
          logging food), JavaScript exceptions, and whether the app is opened
          as an installed PWA. Sign-in events store that the provider was
          Google and that the email domain was umich.edu. They do not store
          the full email address in the event. Analytics identifies you by the
          same account id used for sign-in, not by a separate advertising
          profile.
        </p>
        <p>
          Requests are sent to PostHog in the United States through a /ingest
          path on this site. If the key is not set, this analytics does not
          run. We do not sell personal information and we do not use it for
          cross-site advertising.
        </p>
      </Section>

      <Section title="What admins can see">
        <p>
          A small number of MaizeMeals project admins can open an account in
          an admin view. It shows the name, email address, uniqname, sign-in
          method, join and last sign-in dates, saved preferences, every review
          and photo the account posted (including anonymous ones), and how
          many food-log entries and favorite dishes it has. It does not show
          the contents of your food log.
        </p>
        <p>
          Admins use this to moderate: they can remove reviews or photos and
          suspend an account that breaks the terms.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          Sign-in uses cookies so the session stays logged in. Analytics, when
          enabled, can use cookies or local storage to keep a device id. Guest
          preferences use local storage only, and so does whether you last
          chose to post reviews anonymously. The installed app can cache its
          shell so pages open offline. That cache is not a copy of your food
          log.
        </p>
      </Section>

      <Section title="Who else processes data">
        <p>The app runs on services that see the data they need to host it:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Supabase stores accounts, profiles, reviews, photos, and food logs.</li>
          <li>Vercel hosts the website and receives standard request logs.</li>
          <li>Google handles the sign-in screen for @umich.edu accounts.</li>
          <li>PostHog receives the analytics described above, when enabled.</li>
          <li>
            MapTiler provides map tiles when you open a dining-hall map. Your
            browser requests those tiles directly.
          </li>
          <li>
            Resend is used to email project admins a digest when review photos
            are waiting. It is not used to email you marketing.
          </li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <p>
          Profile, review, photo, and food-log data stays until you delete the
          account or remove that item. Deleting the account in Settings removes
          the sign-in user and the related profile, food logs, macro goals,
          and favorite dishes. You confirm by typing the phrase the settings
          screen asks for.
        </p>
        <p>
          Reviews and review photos are kept after you delete your account so
          dish ratings stay meaningful. They are unlinked from you and shown as
          &ldquo;Deleted user&rdquo; (or &ldquo;Anonymous&rdquo; if you posted
          them anonymously). To remove them, delete those reviews before
          deleting your account.
        </p>
        <p>
          Analytics events already sent to PostHog are not pulled back by
          account deletion. A deletion event is recorded under the account id
          so we can see that the account was removed.
        </p>
      </Section>

      <Section title="Children">
        <p>
          MaizeMeals is for University of Michigan Google accounts. It is not
          directed at children under 13. If we learn an account belongs to a
          child under 13, we will delete it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, the date at the top of the page changes with
          it. Continuing to use MaizeMeals after that date means the updated
          policy applies.
        </p>
        <p>
          The{' '}
          <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>{' '}
          cover how the product may be used. Allergen and menu accuracy notes
          are also in the{' '}
          <Link href="/faq" className="text-primary underline-offset-4 hover:underline">
            FAQ
          </Link>
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
