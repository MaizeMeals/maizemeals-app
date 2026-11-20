"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Camera, LogIn, Pencil } from "lucide-react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { StarRatingInput } from "./StarRatingInput";
import { submitReview, type SubmitReviewResult } from "@/app/actions/submit-review";
import { AnonymousToggle, readAnonymousPref, writeAnonymousPref } from "@/components/reviews/AnonymousToggle";
import {
  EditReviewDialog,
  type EditReviewTarget,
} from "@/components/reviews/EditReviewDialog";
import { createClient } from "@/lib/supabase/client";
import {
  compressReviewPhoto,
  REVIEW_PHOTO_PROCESS_ERROR,
} from "@/lib/compress-review-photo";
import { cn } from "@/lib/utils";

type AuthStatus = "loading" | "signed-in" | "signed-out";

type OwnReview = EditReviewTarget & { rating: number };

type Props = {
  itemId: string;
  itemName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful post so the parent can refetch location/menu data. */
  onPosted?: () => void;
};

function locationSlugFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf("locations");
  if (i === -1 || !parts[i + 1]) return null;
  return parts[i + 1];
}

export function ReviewModal({ itemId, itemName, open, onOpenChange, onPosted }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const postLoginPath = `${pathname}?review=${encodeURIComponent(itemId)}`;
  const locationSlug = locationSlugFromPathname(pathname);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [ownReview, setOwnReview] = useState<OwnReview | null>(null);
  const [loadingOwnReview, setLoadingOwnReview] = useState(false);
  const [ownReviewError, setOwnReviewError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const photoRequestRef = useRef(0);
  const reviewRequestRef = useRef(0);
  /** Read at event time so a nested edit dialog cannot dismiss this one mid-open. */
  const editOpenRef = useRef(false);

  const setEditing = useCallback((next: boolean) => {
    editOpenRef.current = next;
    setEditOpen(next);
  }, []);

  const resetComposer = useCallback(() => {
    photoRequestRef.current += 1;
    reviewRequestRef.current += 1;
    setRating(0);
    setComment("");
    setPhotoFile(null);
    // Remember the last choice so regular anonymous posters don't re-tick it.
    setAnonymous(readAnonymousPref());
    setIsCompressing(false);
    setAlreadyReviewed(false);
    setOwnReview(null);
    setLoadingOwnReview(false);
    setOwnReviewError(null);
    setEditing(false);
  }, [setEditing]);

  useEffect(() => {
    if (!open) {
      setAuthStatus("loading");
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setAuthStatus(session?.user ? "signed-in" : "signed-out");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    resetComposer();
  }, [itemId, resetComposer]);

  const loadOwnReview = useCallback(async (): Promise<
    { ok: true; review: OwnReview } | { ok: false; message: string }
  > => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return { ok: false, message: "Sign in again to edit your review." };
    }

    const { data: row, error } = await supabase
      .from("user_ratings")
      .select("id, rating, comment, is_anonymous")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !row) {
      if (error) {
        console.error("[ReviewModal] load own review failed:", error.message);
      }
      return { ok: false, message: "Couldn't load your review. Try again." };
    }

    const { data: photoRows, error: photoError } = await supabase
      .from("photos")
      .select("storage_path, is_approved")
      .eq("user_rating_id", row.id);

    if (photoError) {
      console.error("[ReviewModal] load review photos failed:", photoError.message);
    }

    return {
      ok: true,
      review: {
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        is_anonymous: row.is_anonymous,
        photos: photoError
          ? null
          : (photoRows ?? []).map((photo) => ({
              storage_path: photo.storage_path,
              is_approved: photo.is_approved,
            })),
      },
    };
  }, [itemId]);

  const refreshOwnReview = useCallback(async () => {
    const requestId = ++reviewRequestRef.current;
    setLoadingOwnReview(true);
    setOwnReviewError(null);
    try {
      const result = await loadOwnReview();
      if (requestId !== reviewRequestRef.current) return null;
      if (!result.ok) {
        setOwnReview(null);
        setOwnReviewError(result.message);
        return null;
      }
      setOwnReview(result.review);
      setOwnReviewError(null);
      return result.review;
    } finally {
      if (requestId === reviewRequestRef.current) {
        setLoadingOwnReview(false);
      }
    }
  }, [loadOwnReview]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && editOpenRef.current) return;
      if (!next && !isSubmitting) {
        resetComposer();
      }
      onOpenChange(next);
    },
    [onOpenChange, isSubmitting, resetComposer]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (rating < 1 || rating > 5) {
        toast.error("Please select a rating (1–5 stars).");
        return;
      }
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.set("item_id", itemId);
        formData.set("rating", String(rating));
        if (comment.trim()) formData.set("comment", comment.trim());
        if (photoFile) formData.set("photo", photoFile);
        if (anonymous) formData.set("is_anonymous", "1");
        if (locationSlug) formData.set("revalidate_location_slug", locationSlug);
        writeAnonymousPref(anonymous);

        const result: SubmitReviewResult = await submitReview(formData);

        if (result.success) {
          onPosted?.();
          router.refresh();
          handleOpenChange(false);
          if (photoFile) {
            toast.success(
              "Review posted! Your photo will appear once approved by a moderator."
            );
          } else {
            toast.success("Review posted!");
          }
          return;
        }

        if (result.status === 401) {
          router.push(
            `/login?next=${encodeURIComponent(postLoginPath)}`
          );
          return;
        }

        if (result.code === "already_reviewed") {
          toast.error(result.error);
          setAlreadyReviewed(true);
          void refreshOwnReview();
          return;
        }

        toast.error(result.error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      itemId,
      rating,
      comment,
      photoFile,
      handleOpenChange,
      router,
      postLoginPath,
      locationSlug,
      onPosted,
      refreshOwnReview,
    ]
  );

  const openOwnReviewEditor = useCallback(async () => {
    const review = ownReview ?? (await refreshOwnReview());
    if (review) setEditing(true);
  }, [ownReview, refreshOwnReview, setEditing]);

  const onPhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const requestId = ++photoRequestRef.current;
    setIsCompressing(true);
    try {
      const compressed = await compressReviewPhoto(file);
      if (requestId !== photoRequestRef.current) return;
      setPhotoFile(compressed);
    } catch (err) {
      console.error("Image compression failed:", err);
      if (requestId !== photoRequestRef.current) return;
      input.value = "";
      setPhotoFile(null);
      toast.error(REVIEW_PHOTO_PROCESS_ERROR);
    } finally {
      if (requestId === photoRequestRef.current) setIsCompressing(false);
    }
  }, []);

  const blockDismissWhileEditing = useCallback(
    (event: { preventDefault: () => void }) => {
      if (editOpenRef.current) event.preventDefault();
    },
    []
  );

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent
          onInteractOutside={blockDismissWhileEditing}
          onPointerDownOutside={blockDismissWhileEditing}
          onFocusOutside={blockDismissWhileEditing}
          onEscapeKeyDown={blockDismissWhileEditing}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="pr-8">
              {authStatus === "signed-out" ? "Sign in to review" : `Rate: ${itemName}`}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {authStatus === "loading" && (
            <ResponsiveDialogBody>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mb-2 h-8 w-8 animate-spin" />
                <span className="text-sm">Checking sign-in…</span>
              </div>
            </ResponsiveDialogBody>
          )}

          {authStatus === "signed-out" && (
            <>
              <ResponsiveDialogBody className="flex flex-col gap-4">
                <p className="text-sm text-foreground">
                  You must be signed in to leave a review.
                </p>
                <p className="text-sm text-muted-foreground">
                  Sign in with your @umich.edu email to rate items and share your experience.
                </p>
              </ResponsiveDialogBody>
              <ResponsiveDialogFooter>
                <form action="/auth/login" method="post" className="w-full">
                  <input type="hidden" name="next" value={postLoginPath} />
                  <Button
                    type="submit"
                    className={cn("w-full gap-2", appPrimaryButtonClassName)}
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in with @umich.edu
                  </Button>
                </form>
              </ResponsiveDialogFooter>
            </>
          )}

          {authStatus === "signed-in" && alreadyReviewed && (
            <>
              <ResponsiveDialogBody className="flex flex-col gap-4" aria-live="polite">
                <p className="text-sm text-foreground">
                  You&apos;ve already reviewed this item.
                </p>
                {ownReview ? (
                  <p className="text-sm text-muted-foreground">
                    Your current rating is {ownReview.rating} out of 5.
                  </p>
                ) : null}
                {ownReviewError ? (
                  <p className="text-sm text-destructive">{ownReviewError}</p>
                ) : null}
              </ResponsiveDialogBody>
              <ResponsiveDialogFooter>
                <Button
                  type="button"
                  onClick={() => void openOwnReviewEditor()}
                  disabled={loadingOwnReview}
                  className={cn("w-full gap-2", appPrimaryButtonClassName)}
                >
                  {loadingOwnReview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                  Edit your review
                </Button>
              </ResponsiveDialogFooter>
            </>
          )}

          {authStatus === "signed-in" && !alreadyReviewed && (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <ResponsiveDialogBody className="flex flex-col gap-4">
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Your rating <span className="text-destructive">*</span>
                  </span>
                  <div className="mt-2">
                    <StarRatingInput
                      value={rating}
                      onChange={setRating}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="review-comment"
                    className="text-sm font-medium text-foreground"
                  >
                    Comment (optional)
                  </label>
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="How was it?"
                    rows={3}
                    maxLength={2000}
                    className={cn(
                      "mt-2 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Photo (optional, JPEG, PNG, or WebP)
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <label
                      className={cn(
                        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                        (isCompressing || isSubmitting) && "pointer-events-none opacity-70"
                      )}
                    >
                      {isCompressing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {isCompressing ? "Compressing…" : photoFile ? photoFile.name : "Choose photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={onPhotoChange}
                        disabled={isSubmitting || isCompressing}
                      />
                    </label>
                    {photoFile && !isCompressing && (
                      <button
                        type="button"
                        onClick={() => setPhotoFile(null)}
                        disabled={isSubmitting}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <AnonymousToggle checked={anonymous} onChange={setAnonymous} disabled={isSubmitting} />
              </ResponsiveDialogBody>
              <ResponsiveDialogFooter>
                <Button
                  type="submit"
                  disabled={isSubmitting || rating < 1 || isCompressing}
                  className={cn("w-full gap-2", appPrimaryButtonClassName)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting…
                    </>
                  ) : (
                    "Post review"
                  )}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <EditReviewDialog
        itemId={itemId}
        review={ownReview}
        open={editOpen && ownReview !== null}
        onOpenChange={setEditing}
        revalidateLocationSlug={locationSlug}
        onSaved={() => {
          onPosted?.();
          router.refresh();
          onOpenChange(false);
        }}
      />
    </>
  );
}
