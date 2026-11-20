"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPostHogClient } from "@/lib/posthog-server";
import { DELETE_CONFIRMATION_PHRASE } from "@/lib/account";
import { ITEM_PHOTOS_BUCKET } from "@/lib/item-photos";

export type DeleteAccountResult = { success: true } | { success: false; error: string };

const STORAGE_BATCH = 100;

/**
 * Permanently deletes the signed-in user's account:
 *   1. Storage objects they own that no review photo uses (abandoned uploads),
 *   2. the auth user — which cascades to user_profiles, food_logs,
 *      user_macro_goals and favorite_foods.
 * Reviews and review photos are kept: their user_id becomes NULL (migration
 * 20261120055118), so they show as "Deleted user" / "Anonymous".
 * Requires typing the confirmation phrase.
 */
export async function deleteAccount(confirmation: string): Promise<DeleteAccountResult> {
  if (confirmation.trim().toLowerCase() !== DELETE_CONFIRMATION_PHRASE) {
    return { success: false, error: `Type “${DELETE_CONFIRMATION_PHRASE}” to confirm.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in to delete your account." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[deleteAccount] admin client unavailable", err);
    return { success: false, error: "Account deletion is temporarily unavailable. Please contact us." };
  }

  // 1. Storage objects (not covered by FK cascades).
  const { data: objects, error: listError } = await admin.rpc("storage_objects_owned_by", {
    target_user: user.id,
  });
  if (listError) {
    console.error("[deleteAccount] storage lookup failed", listError);
    return { success: false, error: "Could not delete your photos. Please try again." };
  }
  // Files behind kept review photos stay; only unreferenced uploads go.
  const { data: keptPhotos, error: keptError } = await admin
    .from("photos")
    .select("storage_path")
    .eq("user_id", user.id);
  if (keptError) {
    console.error("[deleteAccount] photo lookup failed", keptError);
    return { success: false, error: "Could not delete your account. Please try again." };
  }
  const keep = new Set((keptPhotos ?? []).map((p) => p.storage_path));
  const byBucket = new Map<string, string[]>();
  for (const o of objects ?? []) {
    if (o.bucket_id === ITEM_PHOTOS_BUCKET && keep.has(o.name)) continue;
    const list = byBucket.get(o.bucket_id) ?? [];
    list.push(o.name);
    byBucket.set(o.bucket_id, list);
  }
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += STORAGE_BATCH) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + STORAGE_BATCH));
      if (error) {
        console.error("[deleteAccount] storage remove failed", { bucket, error });
        return { success: false, error: "Could not delete your photos. Please try again." };
      }
    }
  }

  // 2. The user (cascades everything else).
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[deleteAccount] deleteUser failed", deleteError);
    return { success: false, error: "Could not delete your account. Please try again or contact us." };
  }

  // Clear the session cookies; the refresh token is already invalid.
  await supabase.auth.signOut().catch(() => undefined);

  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    const posthog = getPostHogClient();
    posthog.capture({ distinctId: user.id, event: "account_deleted" });
    await posthog.shutdown();
  }

  revalidatePath("/", "layout");
  return { success: true };
}
