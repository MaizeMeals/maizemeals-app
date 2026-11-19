"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string | null
  reviewer_profiles: { display_name: string | null } | null
}

const PREVIEW = 5

/** Latest reviews for one item, inside the item drawer's Reviews tab. */
export function ItemReviewsTab({
  itemId,
  reviewCount,
  reviewsHref,
}: {
  itemId: string
  reviewCount: number
  reviewsHref: string
}) {
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReviews(null)
    setFailed(false)
    createClient()
      .from("user_ratings")
      .select("id, rating, comment, created_at, reviewer_profiles ( display_name )")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(PREVIEW)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setFailed(true)
        else setReviews((data ?? []) as unknown as Review[])
      })
    return () => {
      cancelled = true
    }
  }, [itemId])

  if (failed) {
    return <p className="text-sm text-muted-foreground">Couldn&apos;t load reviews right now.</p>
  }
  if (reviews === null) {
    return (
      <div className="space-y-4" aria-label="Loading reviews">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    )
  }
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reviews yet. Tap <span className="font-semibold text-foreground">I ate this</span> to be the first.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        {reviews.map((r) => (
          <li key={r.id} className="py-3 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={i < r.rating ? "h-3.5 w-3.5 fill-maize text-maize" : "h-3.5 w-3.5 text-muted-foreground/40"}
                    aria-hidden
                  />
                ))}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.reviewer_profiles?.display_name ?? "Student"}
                {r.created_at ? ` · ${formatDistanceToNowStrict(new Date(r.created_at))} ago` : ""}
              </span>
            </div>
            {r.comment ? <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{r.comment}</p> : null}
          </li>
        ))}
      </ul>
      {reviewCount > reviews.length ? (
        <Link href={reviewsHref} className="text-sm font-medium text-primary hover:underline">
          See all {reviewCount} reviews
        </Link>
      ) : (
        <Link href={reviewsHref} className="text-sm font-medium text-primary hover:underline">
          Open reviews page
        </Link>
      )}
    </div>
  )
}
