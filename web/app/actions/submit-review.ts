"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ITEM_PHOTOS_BUCKET } from "@/lib/item-photos";
import {
  MAX_REVIEW_PHOTO_BYTES,
  reviewPhotoFileExtension,
} from "@/lib/review-upload";
import { syncUserProfileIdentity } from "@/lib/sync-user-profile-identity";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SubmitReviewResult =
  | { success: true }
  | { success: false; error: string; status?: number };

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function submitReview(
  formData: FormData
): Promise<SubmitReviewResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to submit a review.", status: 401 };
  }

  const itemIdRaw = formData.get("item_id");
  const itemId =
    typeof itemIdRaw === "string" ? itemIdRaw.trim() : null;
  if (!itemId || !isValidUUID(itemId)) {
    return { success: false, error: "Invalid item." };
  }

  const ratingRaw = formData.get("rating");
  const rating =
    ratingRaw !== null && ratingRaw !== undefined
      ? Number(ratingRaw)
      : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Rating must be a number between 1 and 5." };
  }

  const commentRaw = formData.get("comment");
  const comment =
    typeof commentRaw === "string" ? commentRaw.trim() || null : null;

  const photoFile = formData.get("photo") ?? formData.get("image");
  const file =
    photoFile instanceof File && photoFile.size > 0 ? photoFile : null;

  if (file && file.size > MAX_REVIEW_PHOTO_BYTES) {
    return {
      success: false,
      error: `Photo must be under ${MAX_REVIEW_PHOTO_BYTES / 1024 / 1024}MB.`,
    };
  }

  const sync = await syncUserProfileIdentity(supabase, user);
  if (!sync.ok) {
    console.error("[submitReview] syncUserProfileIdentity failed:", sync.error);
    return {
      success: false,
      error: "Could not sync your profile. Please try signing out and back in.",
    };
  }

  const { data: insertedRating, error: ratingError } = await supabase
    .from("user_ratings")
    .insert({
      user_id: user.id,
      item_id: itemId,
      rating,
      comment: comment ?? undefined,
    })
    .select("id")
    .single();

  if (ratingError) {
    console.error("[submitReview] user_ratings insert failed:", {
      message: ratingError.message,
      code: ratingError.code,
      details: ratingError.details,
      hint: ratingError.hint,
    });
    return {
      success: false,
      error: formatUserRatingError(ratingError),
    };
  }

  if (file) {
    const userRatingId = insertedRating?.id;
    if (!userRatingId) {
      return {
        success: false,
        error: "Your rating was saved, but the photo could not be linked. You can add a photo later.",
      };
    }
    const ext = reviewPhotoFileExtension(file.name);
    const pathSegment = `${crypto.randomUUID()}${ext}`;
    const storagePath = `${itemId}/${pathSegment}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(ITEM_PHOTOS_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[submitReview] storage upload failed:", uploadError);
      return {
        success: false,
        error: "Your rating was saved, but the photo failed to upload. You can add a photo later.",
      };
    }

    const { error: photoInsertError } = await supabase.from("photos").insert({
      user_id: user.id,
      item_id: itemId,
      storage_path: storagePath,
      user_rating_id: userRatingId,
    });

    if (photoInsertError) {
      console.error("[submitReview] photos insert failed:", photoInsertError);
      return {
        success: false,
        error: "Your rating was saved, but the photo could not be linked. You can add a photo later.",
      };
    }
  }

  const slugRaw = formData.get("revalidate_location_slug");
  const locationSlug =
    typeof slugRaw === "string" ? slugRaw.trim() : "";
  if (locationSlug) {
    revalidatePath(`/locations/${locationSlug}`);
  }
  revalidatePath("/locations");
  revalidatePath("/reviews");

  return { success: true };
}

function formatUserRatingError(err: {
  message: string;
  code?: string;
}): string {
  if (process.env.NODE_ENV === "development") {
    return `Could not save review: ${err.message}${err.code ? ` (${err.code})` : ""}`;
  }
  if (err.code === "42501") {
    return "You do not have permission to post a review. If this persists, contact support.";
  }
  if (err.code === "23505") {
    return "You have already reviewed this item.";
  }
  if (err.code === "23503") {
    return "This menu item could not be found. Try again from today’s menu.";
  }
  return "Failed to save your rating. Please try again.";
}
