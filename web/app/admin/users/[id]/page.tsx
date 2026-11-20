import Link from "next/link";
import { notFound } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { AdminReviewList } from "@/components/admin/AdminReviewList";
import { BanControls } from "@/components/admin/BanControls";
import { getUserDetail, isBanned, requireAdminPage } from "@/lib/admin/data";
import { ADDITIVE_CATEGORIES } from "@/lib/ingredients";

export const dynamic = "force-dynamic";

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{children}</dd>
    </div>
  );
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { admin } = await requireAdminPage();
  const { id } = await params;
  const detail = await getUserDetail(admin, id);
  if (!detail) notFound();
  const { user: u, profile, counts, reviews } = detail;
  const banned = isBanned(u.bannedUntil);
  const additiveLabel = (c: string) => ADDITIVE_CATEGORIES[c as keyof typeof ADDITIVE_CATEGORIES]?.label ?? c;

  return (
    <PageShell width="wide" className="min-h-screen bg-background">
      <PageHeader
        title={u.name ?? "Unnamed account"}
        description={u.email ?? undefined}
        actions={
          <Link href="/admin/users" className="text-sm text-primary hover:underline">
            All users
          </Link>
        }
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.name ?? "Unnamed"}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {u.isAdmin ? <Badge variant="maize-soft" shape="pill">Admin</Badge> : null}
                  {banned ? (
                    <Badge variant="danger" shape="pill">Suspended until {when(u.bannedUntil)}</Badge>
                  ) : (
                    <Badge variant="success" shape="pill">Active</Badge>
                  )}
                </div>
              </div>
            </div>
            <dl className="mt-3 divide-y divide-border">
              <Row label="Email">{u.email ?? "—"}</Row>
              <Row label="Uniqname">{u.uniqname ?? "—"}</Row>
              <Row label="User id"><code className="text-xs">{u.id}</code></Row>
              <Row label="Sign-in">{u.provider ?? "—"}</Row>
              <Row label="Joined">{when(u.createdAt)}</Row>
              <Row label="Last sign-in">{when(u.lastSignInAt)}</Row>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Activity</h2>
            <dl className="mt-2 divide-y divide-border">
              <Row label="Reviews">
                {u.reviews}
                {u.anonymousReviews ? ` (${u.anonymousReviews} anonymous)` : ""}
              </Row>
              <Row label="Photos">{u.photos}</Row>
              <Row label="Food log entries">
                {counts.foodLogs}
                {counts.lastFoodLogOn ? ` · last ${counts.lastFoodLogOn}` : ""}
              </Row>
              <Row label="Favorite dishes">{counts.favorites}</Row>
              {profile ? <Row label="Saved places">{profile.favoriteLocations}</Row> : null}
              {profile ? <Row label="Streak">{profile.streakCurrent} (best {profile.streakMax})</Row> : null}
            </dl>
          </section>

          {profile ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Preferences</h2>
              <dl className="mt-2 divide-y divide-border">
                <Row label="Onboarded">{profile.onboardingCompleted ? "Yes" : "No"}</Row>
                <Row label="Dealbreakers">{profile.dietaryFilters.join(", ") || "None"}</Row>
                <Row label="Avoids">
                  {[...(profile.avoid?.allergens ?? []), ...(profile.avoid?.additives ?? []).map(additiveLabel)].join(", ") ||
                    "None"}
                </Row>
                <Row label="Sliders">
                  Health {profile.healthFocus} · Protein {profile.proteinPriority} · Ratings {profile.ratingSensitivity}
                </Row>
                <Row label="Profile updated">{when(profile.profileUpdatedAt)}</Row>
              </dl>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">No profile row (never finished signing in).</p>
          )}

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Suspend</h2>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Suspended accounts can&apos;t sign in, and can&apos;t post or edit reviews. Their existing reviews stay up
              unless you delete them.
            </p>
            <BanControls userId={u.id} banned={banned} disabled={u.isAdmin} />
          </section>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Reviews ({reviews.length})</h2>
          <AdminReviewList reviews={reviews} showAuthor={false} />
        </section>
      </div>
    </PageShell>
  );
}
