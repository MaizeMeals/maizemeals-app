"use client";

import Image from "next/image";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  format,
  formatDistanceToNow,
  isValid,
  isYesterday,
} from "date-fns";
import { ChevronLeft, Pencil, Star, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditReviewDialog } from "@/components/reviews/EditReviewDialog";
import { Button } from "@/components/ui/button";
import { appSurfaceOutlineButtonClassName } from "@/lib/button-styles";
import { getItemPhotoPublicUrl } from "@/lib/item-photos";
import { cn } from "@/lib/utils";
import { HEADER_HEIGHT } from "@/components/layout/constants";

/** Same-origin path only; ignores open-redirect values. */
function safeMenuReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("\0")) return null;
  return decoded;
}

type SortMode = "newest" | "highest" | "lowest";

type ReviewProfile = {
  uniqname: string | null;
  avatar_url: string | null;
  display_name: string | null;
};

type ReviewPhoto = {
  storage_path: string;
  is_approved: boolean | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  edited_at: string | null;
  user_id: string;
  user_profiles: ReviewProfile | null;
  photos: ReviewPhoto[] | null;
};

type ItemSummary = {
  name: string;
  avg_rating: number | null;
  review_count: number;
};

const USER_RATINGS_SELECT = `
  id,
  rating,
  comment,
  created_at,
  edited_at,
  user_id,
  user_profiles (
    uniqname,
    avatar_url,
    display_name
  ),
  photos (
    storage_path,
    is_approved
  )
`;

function pickDisplayPhoto(
  photos: ReviewPhoto[] | null | undefined,
  isOwn: boolean,
): ReviewPhoto | undefined {
  if (!Array.isArray(photos) || photos.length === 0) return undefined;
  if (isOwn) return photos[0];
  return photos.find((p) => p.is_approved === true);
}

function ReviewTimestamp({
  createdAt,
  editedAt,
}: {
  createdAt: string | null;
  editedAt: string | null;
}) {
  const edited =
    !!editedAt &&
    !!createdAt &&
    new Date(editedAt).getTime() > new Date(createdAt).getTime();
  const displayIso = edited ? editedAt : createdAt;
  if (!displayIso) return null;
  const d = new Date(displayIso);
  if (!isValid(d)) return null;
  const label = isYesterday(d)
    ? "Yesterday"
    : formatDistanceToNow(d, { addSuffix: true });
  return (
    <time
      dateTime={displayIso}
      title={format(d, "PPp")}
      className="text-xs text-muted-foreground"
    >
      {label}
      {edited ? " (edited)" : ""}
    </time>
  );
}

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortReviews(list: ReviewRow[], sort: SortMode): ReviewRow[] {
  const copy = [...list];
  if (sort === "newest") {
    copy.sort(
      (a, b) => parseTime(b.created_at) - parseTime(a.created_at),
    );
  } else if (sort === "highest") {
    copy.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return parseTime(b.created_at) - parseTime(a.created_at);
    });
  } else {
    copy.sort((a, b) => {
      if (a.rating !== b.rating) return a.rating - b.rating;
      return parseTime(b.created_at) - parseTime(a.created_at);
    });
  }
  return copy;
}

function RatingSummaryBlock({
  reviewCount,
  avgRating,
  reviews,
}: {
  reviewCount: number;
  avgRating: number | null;
  reviews: ReviewRow[];
}) {
  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      const k = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[k] += 1;
    }
    return counts;
  }, [reviews]);

  const maxBar = useMemo(() => {
    let m = 0;
    for (let s = 1; s <= 5; s += 1) m = Math.max(m, distribution[s]);
    return Math.max(1, m);
  }, [distribution]);

  if (reviewCount === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        No reviews yet — be the first to rate this item.
      </div>
    );
  }

  const avg =
    avgRating != null && Number.isFinite(avgRating)
      ? avgRating
      : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="shrink-0">
          <p className="text-4xl font-semibold tabular-nums text-foreground">
            {avg.toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Average rating</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {reviewCount} review{reviewCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const n = distribution[stars];
            const pct = (n / maxBar) * 100;
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {stars}★
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-maize transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ItemReviewsContent() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item_id");
  const menuReturnPath = safeMenuReturnPath(searchParams.get("return"));
  const [itemSummary, setItemSummary] = useState<ItemSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("newest");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewRow | null>(null);

  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const refetchData = useCallback(async () => {
    if (!itemId) return;
    const supabase = createClient();
    const [itemRes, ratingsRes] = await Promise.all([
      supabase
        .from("items")
        .select("name, avg_rating, review_count")
        .eq("id", itemId)
        .maybeSingle(),
      supabase
        .from("user_ratings")
        .select(USER_RATINGS_SELECT)
        .eq("item_id", itemId)
        .order("created_at", { ascending: false }),
    ]);

    if (itemRes.error || ratingsRes.error) return;

    const row = itemRes.data;
    setItemSummary(
      row
        ? {
            name: row.name ?? "Menu item",
            avg_rating: row.avg_rating,
            review_count: row.review_count ?? 0,
          }
        : {
            name: "Menu item",
            avg_rating: null,
            review_count: 0,
          },
    );
    setReviews((ratingsRes.data as ReviewRow[]) ?? []);
  }, [itemId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      setError(null);
      setItemSummary(null);
      setReviews([]);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      setLoading(true);
      setError(null);

      const [itemRes, ratingsRes] = await Promise.all([
        supabase
          .from("items")
          .select("name, avg_rating, review_count")
          .eq("id", itemId)
          .maybeSingle(),
        supabase
          .from("user_ratings")
          .select(USER_RATINGS_SELECT)
          .eq("item_id", itemId)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (itemRes.error) {
        setError(itemRes.error.message);
        setLoading(false);
        return;
      }
      if (ratingsRes.error) {
        setError(ratingsRes.error.message);
        setLoading(false);
        return;
      }

      const row = itemRes.data;
      setItemSummary(
        row
          ? {
              name: row.name ?? "Menu item",
              avg_rating: row.avg_rating,
              review_count: row.review_count ?? 0,
            }
          : {
              name: "Menu item",
              avg_rating: null,
              review_count: 0,
            },
      );
      setReviews((ratingsRes.data as ReviewRow[]) ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const sortedReviews = useMemo(
    () => sortReviews(reviews, sort),
    [reviews, sort],
  );

  if (!itemId) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Open a menu item at a dining hall and tap &quot;See reviews&quot; to view ratings here.
        </p>
        <Link
          href="/locations"
          className="text-sm font-medium text-maize hover:underline"
        >
          Browse locations
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-xl bg-muted" aria-busy aria-label="Loading reviews" />
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Reviews</h1>
        <p className="text-sm text-destructive">{error}</p>
        <Link
          href={menuReturnPath ?? "/locations"}
          className="text-sm font-medium text-maize hover:underline"
        >
          {menuReturnPath ? "Return to menu" : "Back to locations"}
        </Link>
      </div>
    );
  }

  const itemName = itemSummary?.name ?? "Menu item";
  const reviewCount = itemSummary?.review_count ?? reviews.length;

  return (
    <div className="space-y-6">
      {menuReturnPath ? (
        <Link
          href={menuReturnPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-maize hover:underline"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          Return to menu
        </Link>
      ) : null}
      <div>
        <h1 className="text-xl font-semibold text-foreground">{itemName}</h1>
      </div>

      <RatingSummaryBlock
        reviewCount={reviewCount}
        avgRating={itemSummary?.avg_rating ?? null}
        reviews={reviews}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium text-foreground">All reviews</h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only">Sort reviews</span>
          <span aria-hidden className="hidden sm:inline">
            Sort
          </span>
          <select
            className={cn(
              "rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground",
              "shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </label>
      </div>

      <EditReviewDialog
        itemId={itemId}
        review={editingReview}
        open={editingReview !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReview(null);
        }}
        onSaved={refetchData}
      />

      <ul className="space-y-4">
        {sortedReviews.map((r) => {
          const p = r.user_profiles;
          const isOwn = currentUserId !== null && r.user_id === currentUserId;
          const label = isOwn
            ? "You"
            : p?.display_name?.trim() ||
              p?.uniqname?.trim() ||
              "Student";
          const avatarUrl = p?.avatar_url?.trim() || null;
          const displayPhoto = pickDisplayPhoto(r.photos, isOwn);
          const thumbUrl = displayPhoto
            ? getItemPhotoPublicUrl(displayPhoto.storage_path)
            : null;

          return (
            <li
              key={r.id}
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatars
                      <img
                        src={avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-tight text-foreground">
                          {label}
                        </p>
                        {isOwn ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-7 gap-1 px-2 text-xs",
                              appSurfaceOutlineButtonClassName,
                            )}
                            onClick={() => setEditingReview(r)}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <div
                          className="flex text-maize"
                          aria-label={`${r.rating} out of 5 stars`}
                        >
                          {Array.from({ length: 5 }, (_, si) => (
                            <Star
                              key={si}
                              className={cn(
                                "h-3.5 w-3.5",
                                si < r.rating
                                  ? "fill-maize text-maize"
                                  : "text-muted-foreground/30",
                              )}
                            />
                          ))}
                        </div>
                        <ReviewTimestamp
                          createdAt={r.created_at}
                          editedAt={r.edited_at}
                        />
                      </div>
                    </div>
                    {r.comment?.trim() ? (
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {r.comment}
                      </p>
                    ) : null}
                  </div>
                </div>
                {thumbUrl ? (
                  <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border sm:mx-0">
                    <Image
                      src={thumbUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized={
                        supabaseOrigin.length > 0 &&
                        thumbUrl.startsWith(supabaseOrigin)
                      }
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href={menuReturnPath ?? "/locations"}
        className="inline-block text-sm font-medium text-maize hover:underline"
      >
        {menuReturnPath ? "Return to menu" : "Back to locations"}
      </Link>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingTop: HEADER_HEIGHT }}
    >
      <div className="container mx-auto max-w-2xl px-4 py-10 lg:max-w-3xl">
        <Suspense
          fallback={
            <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading" />
          }
        >
          <ItemReviewsContent />
        </Suspense>
      </div>
    </div>
  );
}
