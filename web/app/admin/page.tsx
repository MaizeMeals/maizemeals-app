import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";
import { getStats, requireAdminPage } from "@/lib/admin/data";
import { countNewFeedback } from "@/lib/admin/feedback";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const cls = "rounded-xl border border-border bg-card p-4 shadow-sm";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-accent/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function AdminHomePage() {
  const { admin } = await requireAdminPage();
  const [s, newFeedback] = await Promise.all([getStats(admin), countNewFeedback(admin)]);
  const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

  return (
    <PageShell width="wide" className="min-h-screen bg-background">
      <PageHeader title="Admin" description="Tools and moderation for MaizeMeals." />

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Accounts" value={s.users} hint={`${s.newUsers7d} new this week`} href="/admin/users" />
        <Stat label="Signed in this week" value={s.activeUsers7d} hint={s.banned ? `${s.banned} suspended` : undefined} />
        <Stat label="Reviews" value={s.reviews} hint={`${s.reviews7d} this week`} href="/admin/reviews" />
        <Stat
          label="Anonymous reviews"
          value={pct(s.anonymousShare)}
          hint={s.deletedAuthorReviews ? `${s.deletedAuthorReviews} from deleted accounts` : undefined}
          href="/admin/reviews?filter=anonymous"
        />
        <Stat label="Photos awaiting review" value={s.pendingPhotos} href="/admin/photos" />
        <Stat label="New feedback" value={newFeedback} href="/admin/feedback" />
        <Stat label="Menus posted through" value={s.menuThrough ?? "—"} hint="Latest scraped date" />
        <Stat label="Ingredients today" value={pct(s.ingredientCoverageToday)} hint="Menu items with a NetNutrition label" />
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {ADMIN_SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0">
                <span className="font-semibold text-foreground">{section.title}</span>
                <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
