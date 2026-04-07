"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import imageCompression from "browser-image-compression";
import { X, Loader2, Camera, LogIn } from "lucide-react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { StarRatingInput } from "./StarRatingInput";
import { submitReview, type SubmitReviewResult } from "@/app/actions/submit-review";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_PHOTO_MB = 2;

type AuthStatus = "loading" | "signed-in" | "signed-out";

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
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !isSubmitting) {
        setRating(0);
        setComment("");
        setPhotoFile(null);
      }
      onOpenChange(next);
    },
    [onOpenChange, isSubmitting]
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
        const slug = locationSlugFromPathname(pathname);
        if (slug) formData.set("revalidate_location_slug", slug);

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
        toast.error(result.error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [itemId, rating, comment, photoFile, handleOpenChange, router, postLoginPath, pathname, onPosted]
  );

  const [isCompressing, setIsCompressing] = useState(false);

  const onPhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setPhotoFile(file);
      return;
    }
    setIsCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      setPhotoFile(compressed);
    } catch (err) {
      console.error("Image compression failed:", err);
      toast.error("Could not compress image. Using original.");
      setPhotoFile(file);
    } finally {
      setIsCompressing(false);
    }
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "border bg-background shadow-lg rounded-xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">
                {authStatus === "signed-out" ? "Sign in to review" : `Rate: ${itemName}`}
              </Dialog.Title>
              <Dialog.Close
                disabled={isSubmitting}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            {authStatus === "loading" && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <span className="text-sm">Checking sign-in…</span>
              </div>
            )}

            {authStatus === "signed-out" && (
              <div className="flex flex-col gap-4 py-2">
                <p className="text-sm text-foreground">
                  You must be signed in to leave a review.
                </p>
                <p className="text-sm text-muted-foreground">
                  Sign in with your @umich.edu email to rate items and share your experience.
                </p>
                <form action="/auth/login" method="post">
                  <input type="hidden" name="next" value={postLoginPath} />
                  <Button
                    type="submit"
                    className={cn("w-full gap-2", appPrimaryButtonClassName)}
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in with @umich.edu
                  </Button>
                </form>
              </div>
            )}

            {authStatus === "signed-in" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    "mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  )}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Photo (optional, compressed to ~500KB)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <label
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                      (isCompressing || isSubmitting) && "opacity-70 pointer-events-none"
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
                      accept="image/jpeg,image/png,image/webp,image/gif"
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

              <Button
                type="submit"
                disabled={isSubmitting || rating < 1}
                className={cn("mt-2 w-full gap-2", appPrimaryButtonClassName)}
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
            </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
