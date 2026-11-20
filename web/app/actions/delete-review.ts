"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeReview } from "@/lib/reviews/remove";

export type DeleteReviewResult = { success: true } | { success: false; error: string };

/** The signed-in author deletes their own review (and its photos). */
export async function deleteOwnReview(reviewId: string): Promise<DeleteReviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sign in to delete your review." };

  // RLS only returns the caller's own rows, so this doubles as the ownership check.
  const { data: own } = await supabase
    .from("user_ratings")
    .select("id")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!own) return { success: false, error: "You can only delete your own reviews." };

  const result = await removeReview(createAdminClient(), reviewId);
  if (!result.ok) {
    console.error("[deleteOwnReview]", result.error);
    return { success: false, error: "Could not delete the review. Please try again." };
  }
  revalidatePath("/reviews");
  return { success: true };
}
