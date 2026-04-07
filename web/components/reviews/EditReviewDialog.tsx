"use client";

import { useState, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import imageCompression from "browser-image-compression";
import { Loader2, X } from "lucide-react";
import { updateReview, type UpdateReviewResult } from "@/app/actions/update-review";
import { Button } from "@/components/ui/button";
import {
  appPrimaryButtonClassName,
  appSurfaceOutlineButtonClassName,
} from "@/lib/button-styles";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MAX_PHOTO_MB = 2;

type ReviewPhoto = {
  storage_path: string;
  is_approved: boolean | null;
};

export type EditReviewTarget = {
  id: string;
  comment: string | null;
  photos: ReviewPhoto[] | null;
};

type Props = {
  itemId: string;
  review: EditReviewTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
};

export function EditReviewDialog({
  itemId,
  review,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    if (open && review) {
      setComment(review.comment ?? "");
      setFile(null);
      setRemovePhoto(false);
    }
  }, [open, review]);

  const hasPhoto =
    !!review &&
    Array.isArray(review.photos) &&
    review.photos.length > 0;

  const onPhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.files?.[0];
      if (!next) {
        setFile(null);
        return;
      }
      setRemovePhoto(false);
      if (!next.type.startsWith("image/")) {
        setFile(next);
        return;
      }
      setCompressing(true);
      try {
        const compressed = await imageCompression(next, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        setFile(compressed);
      } catch (err) {
        console.error("Image compression failed:", err);
        toast.error("Could not compress image. Using original.");
        setFile(next);
      } finally {
        setCompressing(false);
      }
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("review_id", review.id);
      fd.set("item_id", itemId);
      fd.set("comment", comment.trim());
      if (removePhoto) fd.set("remove_photo", "1");
      if (file) fd.set("photo", file);

      const res: UpdateReviewResult = await updateReview(fd);
      if (res.success) {
        toast.success("Review updated.");
        onOpenChange(false);
        await onSaved();
        return;
      }
      if (res.status === 401) {
        toast.error(res.error);
        return;
      }
      toast.error(res.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "overflow-hidden rounded-xl border bg-background shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Edit your review
              </Dialog.Title>
              <Dialog.Close
                disabled={submitting}
                type="button"
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            <div>
              <label
                htmlFor="edit-review-comment"
                className="text-sm font-medium text-foreground"
              >
                Comment
              </label>
              <textarea
                id="edit-review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
                rows={4}
                className={cn(
                  "mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                placeholder="Share your thoughts (optional)"
              />
            </div>

            {hasPhoto ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={removePhoto}
                  disabled={submitting || !!file}
                  onChange={(e) => setRemovePhoto(e.target.checked)}
                  className="rounded border-input"
                />
                Remove current photo
              </label>
            ) : null}

            <div>
              <label
                htmlFor="edit-review-photo"
                className="text-sm font-medium text-foreground"
              >
                {hasPhoto ? "Replace photo" : "Add photo"} (optional, max{" "}
                {MAX_PHOTO_MB}MB)
              </label>
              <input
                id="edit-review-photo"
                type="file"
                accept="image/*"
                disabled={submitting || compressing}
                onChange={onPhotoChange}
                className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
              />
              {compressing ? (
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Compressing…
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                New or replaced photos are shown after moderator approval.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  className={appSurfaceOutlineButtonClassName}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                disabled={submitting || compressing}
                className={cn("gap-2", appPrimaryButtonClassName)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
