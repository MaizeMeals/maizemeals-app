"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNowStrict } from "date-fns"
import { Camera, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getItemPhotoPublicUrl } from "@/lib/item-photos"
import { catalogQuery } from "@/lib/catalog-query"
import { Skeleton } from "@/components/ui/skeleton"

type Review = {
  id: string
  item_id: string
  item_name: string
  rating: number
  comment: string | null
  created_at: string | null
  author_name: string
  is_mine: boolean
  is_anonymous: boolean
  photos: unknown
}

function photoPaths(photos: unknown): string[] {
  if (!Array.isArray(photos)) return []
  return photos
    .map((p) => (p && typeof p === "object" ? (p as { storage_path?: unknown }).storage_path : null))
    .filter((p): p is string => typeof p === "string")
}

/**
 * Real recent reviews for one hall (replaces the old placeholder "Live
 * Activity" block). Tapping a review opens that dish; the button starts a
 * review through the hall's dish picker.
 */
export function RecentReviews({
  hallId,
  slug,
  onAddReview,
}: {
  hallId: string
  slug: string
  onAddReview: () => void
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["hall-reviews", hallId],
    queryFn: async () => {
      const { data, error } = await createClient().rpc("reviews_public", { p_hall_id: hallId, p_limit: 12 })
      if (error) throw error
      const reviews = (data ?? []) as unknown as Review[]
      const weekAgo = Date.now() - 7 * 86_400_000
      const thisWeek = reviews.filter((r) => r.created_at && Date.parse(r.created_at) >= weekAgo).length
      return { reviews, thisWeek }
    },
    ...catalogQuery,
    staleTime: 5 * 60 * 1000,
  })

  if (isError) return null
  const reviews = data?.reviews ?? []
  const thisWeek = data?.thisWeek ?? 0

  return (
    <section aria-labelledby="recent-reviews-heading" className="border-t border-border bg-muted/40 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="recent-reviews-heading" className="text-lg font-bold text-foreground">
              Recent reviews
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isPending
                ? "Loading…"
                : reviews.length === 0
                  ? "No one has reviewed a dish here yet."
                  : thisWeek > 0
                    ? `${thisWeek} review${thisWeek === 1 ? "" : "s"} in the last week`
                    : "What students said about dishes here"}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddReview}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Rate a dish
          </button>
        </div>

        {isPending ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-64 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            Ate here? Be the first: tap <strong className="text-foreground">Rate a dish</strong>, pick what you had, and
            add a photo if you like.
          </p>
        ) : (
          <ul className="flex snap-x scroll-px-4 gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {reviews.map((r) => {
              const photo = photoPaths(r.photos)[0]
              const author = r.is_mine ? (r.is_anonymous ? "You (anonymous)" : "You") : r.author_name
              return (
                <li key={r.id} className="w-64 shrink-0 snap-start">
                  <Link
                    href={`/locations/${slug}?item=${encodeURIComponent(r.item_id)}`}
                    scroll={false}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
                  >
                    {photo ? (
                      // Approved review photos from Supabase Storage.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getItemPhotoPublicUrl(photo)} alt={`Photo of ${r.item_name}`} loading="lazy" className="h-32 w-full object-cover" />
                    ) : null}
                    <span className="flex flex-1 flex-col gap-1.5 p-3">
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-semibold text-foreground">{r.item_name}</span>
                        <span className="flex shrink-0 items-center gap-0.5" aria-label={`${r.rating} out of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={i < r.rating ? "h-3 w-3 fill-maize text-maize" : "h-3 w-3 text-muted-foreground/40"}
                              aria-hidden
                            />
                          ))}
                        </span>
                      </span>
                      {r.comment ? <span className="line-clamp-3 text-sm text-foreground/90">{r.comment}</span> : null}
                      <span className="mt-auto text-xs text-muted-foreground">
                        {author}
                        {r.created_at ? ` · ${formatDistanceToNowStrict(new Date(r.created_at))} ago` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
