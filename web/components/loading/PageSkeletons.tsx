import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant placeholders shown while a page renders on the server. With these,
 * Next.js prefetches each tab's shell, so the bottom bar responds on tap.
 */

export function ListPageSkeleton({ label }: { label: string }) {
  return (
    <PageShell aria-busy="true" aria-label={label}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <Skeleton className="mt-6 h-11 w-full rounded-full" />
      <div className="mt-4 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </PageShell>
  );
}

export function MacrosSkeleton() {
  return (
    <PageShell aria-busy="true" aria-label="Loading macro tracking">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <Skeleton className="mt-6 h-14 w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
    </PageShell>
  );
}

export function SettingsSkeleton() {
  return (
    <PageShell width="narrow" aria-busy="true" aria-label="Loading settings">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-10 space-y-3 border-t border-border pt-8">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      ))}
    </PageShell>
  );
}

export function MapSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading locations"
      className="relative w-full bg-muted"
      style={{ height: "calc(100dvh - var(--bottom-nav-h, 0px))" }}
    >
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}
