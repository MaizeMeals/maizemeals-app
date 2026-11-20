"use server";

import { revalidatePath } from "next/cache";
import { adminForAction } from "@/lib/admin/data";
import { getAdminUserIds } from "@/lib/supabase/admin";
import { removeReview } from "@/lib/reviews/remove";

export type AdminActionResult = { success: true } | { success: false; error: string };

/** Admin removes any review (and its photos). */
export async function adminDeleteReview(reviewId: string): Promise<AdminActionResult> {
  const ctx = await adminForAction();
  if (!ctx) return { success: false, error: "Not allowed." };
  const result = await removeReview(ctx.admin, reviewId);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/admin", "layout");
  return { success: true };
}

const BAN_DURATIONS = { day: "24h", week: "168h", forever: "876000h", none: "none" } as const;
export type BanLength = keyof typeof BAN_DURATIONS;

/**
 * Suspend (or reinstate) an account. Suspended users can't sign in or
 * refresh their session, and posting/editing reviews is refused even while
 * an old session token is still valid.
 */
export async function adminSetBan(userId: string, length: BanLength): Promise<AdminActionResult> {
  const ctx = await adminForAction();
  if (!ctx) return { success: false, error: "Not allowed." };
  if (!(length in BAN_DURATIONS)) return { success: false, error: "Unknown duration." };
  if (userId === ctx.me.id || getAdminUserIds().includes(userId)) {
    return { success: false, error: "Admins can't be suspended here." };
  }
  const { error } = await ctx.admin.auth.admin.updateUserById(userId, { ban_duration: BAN_DURATIONS[length] });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { success: true };
}
