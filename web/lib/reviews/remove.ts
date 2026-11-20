import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { ITEM_PHOTOS_BUCKET } from "@/lib/item-photos";

/**
 * Delete one review, its photo rows and their Storage files. Uses the
 * service-role client: callers must already have checked that the requester
 * owns the review or is an admin. Rating aggregates refresh via trigger.
 */
export async function removeReview(
  admin: SupabaseClient<Database>,
  reviewId: string,
): Promise<{ ok: true; itemId: string } | { ok: false; error: string }> {
  const { data: review, error: reviewError } = await admin
    .from("user_ratings")
    .select("id, item_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (reviewError) return { ok: false, error: reviewError.message };
  if (!review) return { ok: false, error: "Review not found." };

  const { data: photos, error: photoError } = await admin
    .from("photos")
    .select("id, storage_path")
    .eq("user_rating_id", reviewId);
  if (photoError) return { ok: false, error: photoError.message };

  const paths = (photos ?? []).map((p) => p.storage_path).filter(Boolean);
  if (paths.length) {
    const { error } = await admin.storage.from(ITEM_PHOTOS_BUCKET).remove(paths);
    if (error) return { ok: false, error: `Could not delete photos: ${error.message}` };
    await admin.from("photos").delete().eq("user_rating_id", reviewId);
  }

  const { error: deleteError } = await admin.from("user_ratings").delete().eq("id", reviewId);
  if (deleteError) return { ok: false, error: deleteError.message };
  return { ok: true, itemId: review.item_id };
}
