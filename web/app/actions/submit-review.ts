"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ITEM_PHOTOS_BUCKET = "item-photos";

/** Max photo size in bytes (e.g. 2MB). */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SubmitReviewResult =
  | { success: true }
  | { success: false; error: string; status?: number };

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return ".jpg";
  const ext = filename.slice(lastDot).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  return allowed.includes(ext) ? ext : ".jpg";
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

  if (file && file.size > MAX_PHOTO_BYTES) {
    return {
      success: false,
      error: `Photo must be under ${MAX_PHOTO_BYTES / 1024 / 1024}MB.`,
    };
  }

  const { error: ratingError } = await supabase.from("user_ratings").insert({
    user_id: user.id,
    item_id: itemId,
    rating,
    comment: comment ?? undefined,
  });

  if (ratingError) {
    return {
      success: false,
      error: "Failed to save your rating. Please try again.",
    };
  }

  if (file) {
    const ext = getFileExtension(file.name);
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
      return {
        success: false,
        error: "Your rating was saved, but the photo failed to upload. You can add a photo later.",
      };
    }

    const { error: photoInsertError } = await supabase.from("photos").insert({
      user_id: user.id,
      item_id: itemId,
      storage_path: storagePath,
    });

    if (photoInsertError) {
      return {
        success: false,
        error: "Your rating was saved, but the photo could not be linked. You can add a photo later.",
      };
    }
  }

  revalidatePath("/locations");

  return { success: true };
}
