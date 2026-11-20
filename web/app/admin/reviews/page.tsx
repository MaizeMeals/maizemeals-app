import Link from "next/link";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { AdminReviewList } from "@/components/admin/AdminReviewList";
import { listReviews, requireAdminPage, type ReviewFilter } from "@/lib/admin/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "anonymous", label: "Anonymous" },
  { id: "low", label: "1–2 stars" },
  { id: "photos", label: "With photos" },
  { id: "deleted", label: "Deleted accounts" },
];

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { admin } = await requireAdminPage();
  const { filter: raw } = await searchParams;
  const filter = (FILTERS.find((f) => f.id === raw)?.id ?? "all") as ReviewFilter;
  const reviews = await listReviews(admin, filter, 150);

  return (
    <PageShell width="wide" className="min-h-screen bg-background">
      <PageHeader
        title="Reviews"
        description="Newest first, with the real author, including anonymous posts."
        actions={
          <Link href="/admin" className="text-sm text-primary hover:underline">
            Admin home
          </Link>
        }
      />
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter reviews">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? "/admin/reviews" : `/admin/reviews?filter=${f.id}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              f.id === filter ? "border-maize bg-maize/20" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        <AdminReviewList key={filter} reviews={reviews} />
      </div>
    </PageShell>
  );
}
