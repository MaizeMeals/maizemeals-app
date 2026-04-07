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

export type UpdateReviewResult =
  | { success: true }
  | { success: false; error: string; status?: number };

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function updateReview(
  formData: FormData
): Promise<UpdateReviewResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be signed in to edit a review.",
      status: 401,
    };
  }

  const authUserId = user.id;

  const reviewIdRaw = formData.get("review_id");
  const reviewId =
    typeof reviewIdRaw === "string" ? reviewIdRaw.trim() : null;
  if (!reviewId || !isValidUUID(reviewId)) {
    return { success: false, error: "Invalid review." };
  }

  const itemIdRaw = formData.get("item_id");
  const itemId =
    typeof itemIdRaw === "string" ? itemIdRaw.trim() : null;
  if (!itemId || !isValidUUID(itemId)) {
    return { success: false, error: "Invalid item." };
  }

  const commentRaw = formData.get("comment");
  const comment =
    typeof commentRaw === "string" ? commentRaw.trim() || null : null;

  const removePhotoRaw = formData.get("remove_photo");
  const removePhoto =
    removePhotoRaw === "1" || removePhotoRaw === "true";

  const photoFile = formData.get("photo") ?? formData.get("image");
  const file =
    photoFile instanceof File && photoFile.size > 0 ? photoFile : null;

  if (file && file.size > MAX_REVIEW_PHOTO_BYTES) {
    return {
      success: false,
      error: `Photo must be under ${MAX_REVIEW_PHOTO_BYTES / 1024 / 1024}MB.`,
    };
  }

  const { data: row, error: fetchError } = await supabase
    .from("user_ratings")
    .select("id, user_id, item_id, comment")
    .eq("id", reviewId)
    .maybeSingle();

  if (fetchError || !row) {
    return { success: false, error: "Review not found." };
  }
  if (row.user_id !== authUserId) {
    return {
      success: false,
      error: "You can only edit your own reviews.",
      status: 403,
    };
  }
  if (row.item_id !== itemId) {
    return { success: false, error: "Item does not match this review." };
  }

  const ratingRowId = reviewId;

  const sync = await syncUserProfileIdentity(supabase, user);
  if (!sync.ok) {
    console.error("[updateReview] syncUserProfileIdentity failed:", sync.error);
    return {
      success: false,
      error: "Could not sync your profile. Please try signing out and back in.",
    };
  }

  const { data: existingPhoto } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("user_rating_id", ratingRowId)
    .maybeSingle();

  const sameComment = (row.comment ?? null) === (comment ?? null);
  const effectiveRemove = removePhoto && !!existingPhoto;

  if (!file && !effectiveRemove && sameComment) {
    return { success: false, error: "Nothing to save." };
  }

  const editedAt = new Date().toISOString();

  async function persistRatingRow() {
    const { error } = await supabase
      .from("user_ratings")
      .update({ comment: comment ?? null, edited_at: editedAt })
      .eq("id", ratingRowId)
      .eq("user_id", authUserId);
    return error;
  }

  if (file) {
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
      console.error("[updateReview] storage upload failed:", uploadError);
      return {
        success: false,
        error: "Could not upload the new photo. Try again.",
      };
    }

    if (existingPhoto) {
      const { error: rmError } = await supabase.storage
        .from(ITEM_PHOTOS_BUCKET)
        .remove([existingPhoto.storage_path]);
      if (rmError) {
        console.error("[updateReview] remove old storage object failed:", rmError);
        await supabase.storage.from(ITEM_PHOTOS_BUCKET).remove([storagePath]);
        return {
          success: false,
          error: "Could not replace your photo. Try again.",
        };
      }
      const { error: photoUpdError } = await supabase
        .from("photos")
        .update({
          storage_path: storagePath,
          is_approved: false,
        })
        .eq("id", existingPhoto.id);

      if (photoUpdError) {
        console.error("[updateReview] photos update failed:", photoUpdError);
        await supabase.storage.from(ITEM_PHOTOS_BUCKET).remove([storagePath]);
        return {
          success: false,
          error: "Could not save the new photo. Try again.",
        };
      }
    } else {
      const { error: photoInsError } = await supabase.from("photos").insert({
        user_id: authUserId,
        item_id: itemId,
        storage_path: storagePath,
        user_rating_id: ratingRowId,
      });
      if (photoInsError) {
        console.error("[updateReview] photos insert failed:", photoInsError);
        await supabase.storage.from(ITEM_PHOTOS_BUCKET).remove([storagePath]);
        return {
          success: false,
          error: "Could not link your photo. Try again.",
        };
      }
    }

    const ratingUpdError = await persistRatingRow();
    if (ratingUpdError) {
      console.error("[updateReview] user_ratings update failed:", ratingUpdError);
      return {
        success: false,
        error: "Could not save your review changes.",
      };
    }
  } else if (removePhoto && existingPhoto) {
    const { storage_path: oldPath, id: oldPhotoId } = existingPhoto;
    const { error: rmError } = await supabase.storage
      .from(ITEM_PHOTOS_BUCKET)
      .remove([oldPath]);
    if (rmError) {
      console.error("[updateReview] storage remove failed:", rmError);
      return {
        success: false,
        error: "Could not remove your photo. Try again.",
      };
    }
    const { error: delPhotoError } = await supabase
      .from("photos")
      .delete()
      .eq("id", oldPhotoId);
    if (delPhotoError) {
      console.error("[updateReview] photos delete failed:", delPhotoError);
      return {
        success: false,
        error: "Could not remove your photo. Try again.",
      };
    }

    const ratingUpdError = await persistRatingRow();
    if (ratingUpdError) {
      console.error("[updateReview] user_ratings update failed:", ratingUpdError);
      return {
        success: false,
        error: "Could not save your review changes.",
      };
    }
  } else {
    const ratingUpdError = await persistRatingRow();
    if (ratingUpdError) {
      console.error("[updateReview] user_ratings update failed:", ratingUpdError);
      return {
        success: false,
        error: "Could not save your review changes.",
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
