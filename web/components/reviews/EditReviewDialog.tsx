"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { updateReview, type UpdateReviewResult } from "@/app/actions/update-review";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  appPrimaryButtonClassName,
  appSurfaceOutlineButtonClassName,
} from "@/lib/button-styles";
import {
  compressReviewPhoto,
  REVIEW_PHOTO_PROCESS_ERROR,
} from "@/lib/compress-review-photo";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AnonymousToggle } from "@/components/reviews/AnonymousToggle";
import { deleteOwnReview } from "@/app/actions/delete-review";
import { PhotoSourceButtons } from "@/components/reviews/PhotoSourceButtons";

type ReviewPhoto = {
  storage_path: string;
  is_approved: boolean | null;
};

export type EditReviewTarget = {
  id: string;
  comment: string | null;
  photos: ReviewPhoto[] | null;
  is_anonymous?: boolean;
};

type Props = {
  itemId: string;
  review: EditReviewTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
  /** Location page to revalidate after a successful save, when known. */
  revalidateLocationSlug?: string | null;
};

export function EditReviewDialog({
  itemId,
  review,
  open,
  onOpenChange,
  onSaved,
  revalidateLocationSlug,
}: Props) {
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const photoRequestRef = useRef(0);

  useEffect(() => {
    if (open && review) {
      setComment(review.comment ?? "");
      setAnonymous(review.is_anonymous ?? false);
      setConfirmDelete(false);
      setFile(null);
      setRemovePhoto(false);
      return;
    }
    photoRequestRef.current += 1;
    setCompressing(false);
  }, [open, review]);

  const hasPhoto =
    !!review &&
    Array.isArray(review.photos) &&
    review.photos.length > 0;

  const onPhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const next = input.files?.[0];
      if (!next) {
        setFile(null);
        return;
      }
      const requestId = ++photoRequestRef.current;
      setCompressing(true);
      try {
        const compressed = await compressReviewPhoto(next);
        if (requestId !== photoRequestRef.current) return;
        setRemovePhoto(false);
        setFile(compressed);
      } catch (err) {
        console.error("Image compression failed:", err);
        if (requestId !== photoRequestRef.current) return;
        input.value = "";
        setFile(null);
        toast.error(REVIEW_PHOTO_PROCESS_ERROR);
      } finally {
        if (requestId === photoRequestRef.current) setCompressing(false);
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
      fd.set("is_anonymous", anonymous ? "1" : "0");
      if (file) fd.set("photo", file);
      const slug = revalidateLocationSlug?.trim();
      if (slug) fd.set("revalidate_location_slug", slug);

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="pr-8">Edit your review</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="flex flex-col gap-4">
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
              <p className="text-sm font-medium text-foreground">
                {hasPhoto ? "Replace photo" : "Add photo"} (optional)
              </p>
              <div className="mt-2">
                <PhotoSourceButtons
                  onChange={onPhotoChange}
                  disabled={submitting}
                  busy={compressing}
                  chooseLabel={file ? "Choose another" : "Choose photo"}
                />
              </div>
              {file && !compressing ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">Attached: {file.name}</p>
              ) : null}
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
            <AnonymousToggle checked={anonymous} onChange={setAnonymous} disabled={submitting} />
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter className="flex-row items-center justify-end gap-2 sm:space-x-0">
            {/* Two taps to delete: no extra dialog on top of this one. */}
            <Button
              type="button"
              variant="ghost"
              disabled={submitting || deleting}
              className="mr-auto text-red-600 hover:bg-destructive/10 hover:text-red-700"
              onClick={async () => {
                if (!review) return;
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                setDeleting(true);
                const res = await deleteOwnReview(review.id);
                setDeleting(false);
                if (!res.success) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Review deleted.");
                onOpenChange(false);
                await onSaved();
              }}
            >
              {deleting ? "Deleting…" : confirmDelete ? "Tap again to delete" : "Delete review"}
            </Button>
            <ResponsiveDialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                className={appSurfaceOutlineButtonClassName}
              >
                Cancel
              </Button>
            </ResponsiveDialogClose>
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
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
