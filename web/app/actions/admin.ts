"use server";

import { revalidatePath } from "next/cache";
import { adminForAction } from "@/lib/admin/data";
import { getAdminUserIds } from "@/lib/supabase/admin";
import { removeReview } from "@/lib/reviews/remove";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/admin/feedback";

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

/** Move a feedback message along (new → read → done, or archived). */
export async function adminSetFeedbackStatus(id: string, status: FeedbackStatus): Promise<AdminActionResult> {
  const ctx = await adminForAction();
  if (!ctx) return { success: false, error: "Not allowed." };
  if (!FEEDBACK_STATUSES.includes(status)) return { success: false, error: "Unknown status." };
  const { error } = await ctx.admin.from("feedback").update({ status }).eq("id", id);
  if (error) return { success: false, error: "Couldn't update that message." };
  revalidatePath("/admin", "layout");
  return { success: true };
}

/** Private note on a feedback message (what we did, who's on it). */
export async function adminSaveFeedbackNote(id: string, note: string): Promise<AdminActionResult> {
  const ctx = await adminForAction();
  if (!ctx) return { success: false, error: "Not allowed." };
  const trimmed = note.trim().slice(0, 2000);
  const { error } = await ctx.admin.from("feedback").update({ admin_note: trimmed || null }).eq("id", id);
  if (error) return { success: false, error: "Couldn't save the note." };
  revalidatePath("/admin/feedback");
  return { success: true };
}
