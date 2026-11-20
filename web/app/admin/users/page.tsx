import Link from "next/link";
import { Search, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { isBanned, listUsers, requireAdminPage } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

function day(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—";
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { admin } = await requireAdminPage();
  const { q = "" } = await searchParams;
  const needle = q.trim().toLowerCase();
  const all = await listUsers(admin);
  const users = needle
    ? all.filter((u) =>
        [u.name, u.email, u.uniqname, u.id].some((v) => v?.toLowerCase().includes(needle)),
      )
    : all;

  return (
    <PageShell width="wide" className="min-h-screen bg-background">
      <PageHeader
        title="Users"
        description={`${all.length} accounts. Search by name, email, uniqname, or user id.`}
        actions={
          <Link href="/admin" className="text-sm text-primary hover:underline">
            Admin home
          </Link>
        }
      />

      <form className="mt-4 flex gap-2" action="/admin/users">
        <label className="relative flex-1">
          <span className="sr-only">Search users</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search users"
            className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm"
          />
        </label>
      </form>

      <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
        {users.map((u) => (
          <li key={u.id}>
            <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{u.name ?? "Unnamed"}</span>
                  {u.isAdmin ? <Badge variant="maize-soft" shape="pill">Admin</Badge> : null}
                  {isBanned(u.bannedUntil) ? <Badge variant="danger" shape="pill">Suspended</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{u.email ?? u.id}</p>
              </div>
              <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                <p>
                  {u.reviews} review{u.reviews === 1 ? "" : "s"}
                  {u.anonymousReviews ? ` (${u.anonymousReviews} anon)` : ""} · {u.photos} photo{u.photos === 1 ? "" : "s"}
                </p>
                <p>Joined {day(u.createdAt)} · last in {day(u.lastSignInAt)}</p>
              </div>
            </Link>
          </li>
        ))}
        {users.length === 0 ? <li className="p-4 text-sm text-muted-foreground">No accounts match “{q}”.</li> : null}
      </ul>
    </PageShell>
  );
}
