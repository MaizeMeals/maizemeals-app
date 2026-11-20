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
  author_name: string;
  is_mine: boolean;
  is_anonymous: boolean;
  item_id: string;
  item_name: string;
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
      .rpc("reviews_public", { p_hall_id: hallId, p_limit: LIMIT })
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
            <Link
              href={`/locations/${venueSlug}?item=${encodeURIComponent(r.item_id)}`}
              className="min-w-0 truncate text-sm font-semibold text-foreground hover:underline"
            >
              {r.item_name}
            </Link>
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
            {r.is_mine ? (r.is_anonymous ? "You (anonymous)" : "You") : r.author_name}
            {r.created_at ? ` · ${formatDistanceToNowStrict(new Date(r.created_at))} ago` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
