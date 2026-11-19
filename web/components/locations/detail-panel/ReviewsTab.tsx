"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Star, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  reviewer_profiles: { display_name: string | null } | null;
  items: { id: string; name: string } | null;
};

const LIMIT = 15;

/** Recent dish reviews at one location (ratings live on items, not halls). */
export function ReviewsTab({ hallId, venueSlug }: { hallId: string; venueSlug: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReviews(null);
    setFailed(false);
    createClient()
      .from("user_ratings")
      .select("id, rating, comment, created_at, reviewer_profiles ( display_name ), items!inner ( id, name, dining_hall_id )")
      .eq("items.dining_hall_id", hallId)
      .order("created_at", { ascending: false })
      .limit(LIMIT)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        else setReviews((data ?? []) as unknown as Review[]);
      });
    return () => {
      cancelled = true;
    };
  }, [hallId]);

  if (failed) {
    return <p className="p-5 text-sm text-muted-foreground">Couldn&apos;t load reviews right now.</p>;
  }

  if (reviews === null) {
    return (
      <div className="space-y-5 p-5" aria-label="Loading reviews">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="p-5">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Star />
            </EmptyMedia>
            <EmptyTitle>No reviews here yet</EmptyTitle>
            <EmptyDescription>
              Ate something good (or bad)? Open the menu, pick the dish, and tap <strong>I ate this</strong>.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            href={`/locations/${venueSlug}`}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <UtensilsCrossed className="h-4 w-4" aria-hidden /> Open today&apos;s menu
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60 px-5">
      {reviews.map((r) => (
        <li key={r.id} className="py-4">
          <div className="flex items-start justify-between gap-3">
            {r.items ? (
              <Link
                href={`/locations/${venueSlug}?item=${encodeURIComponent(r.items.id)}`}
                className="min-w-0 truncate text-sm font-semibold text-foreground hover:underline"
              >
                {r.items.name}
              </Link>
            ) : (
              <span className="text-sm font-semibold">A dish</span>
            )}
            <span className="flex shrink-0 items-center gap-0.5" aria-label={`${r.rating} out of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={i < r.rating ? "h-3.5 w-3.5 fill-maize text-maize" : "h-3.5 w-3.5 text-muted-foreground/40"}
                  aria-hidden
                />
              ))}
            </span>
          </div>
          {r.comment ? <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{r.comment}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {r.reviewer_profiles?.display_name ?? "Student"}
            {r.created_at ? ` · ${formatDistanceToNowStrict(new Date(r.created_at))} ago` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
