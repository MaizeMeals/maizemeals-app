import Link from "next/link";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { AdminFeedbackList } from "@/components/admin/AdminFeedbackList";
import { requireAdminPage } from "@/lib/admin/data";
import { listFeedback, type FeedbackStatus } from "@/lib/admin/feedback";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: { id: FeedbackStatus | "all"; label: string }[] = [
  { id: "new", label: "New" },
  { id: "all", label: "All open" },
  { id: "read", label: "Read" },
  { id: "done", label: "Done" },
  { id: "archived", label: "Archived" },
];

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { admin } = await requireAdminPage();
  const { status: raw } = await searchParams;
  const status = FILTERS.find((f) => f.id === raw)?.id ?? "new";
  const items = await listFeedback(admin, status);

  return (
    <PageShell width="wide" className="min-h-screen bg-background">
      <PageHeader
        title="Feedback"
        description="Sent from the app by guests and signed-in users. Newest first."
        actions={
          <Link href="/admin" className="text-sm text-primary hover:underline">
            Admin home
          </Link>
        }
      />
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter feedback">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "new" ? "/admin/feedback" : `/admin/feedback?status=${f.id}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              f.id === status ? "border-umich-blue bg-umich-blue text-white dark:border-maize dark:bg-maize dark:text-umich-blue" : "border-border hover:bg-muted",
            )}
            aria-current={f.id === status ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <AdminFeedbackList items={items} />
    </PageShell>
  );
}
