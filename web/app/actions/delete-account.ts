"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPostHogClient } from "@/lib/posthog-server";
import { DELETE_CONFIRMATION_PHRASE } from "@/lib/account";

export type DeleteAccountResult = { success: true } | { success: false; error: string };

const STORAGE_BATCH = 100;

/**
 * Permanently deletes the signed-in user's account:
 *   1. every Storage object they own (review photos, incl. orphans),
 *   2. the auth user — which cascades to user_profiles, user_ratings (and
 *      the rating aggregates refresh), photos, food_logs, user_macro_goals
 *      and favorite_foods (see migrations 20261118185119 / 20261118194025).
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
  const byBucket = new Map<string, string[]>();
  for (const o of objects ?? []) {
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
