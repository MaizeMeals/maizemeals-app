import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  reviewerAvatarUrlFromUser,
  reviewerDisplayNameFromUser,
} from "@/lib/reviewer-display";

export function uniqnameFromUser(user: User): string {
  const local = user.email?.split("@")[0]?.toLowerCase().trim();
  if (local) return local;
  return `user_${user.id.slice(0, 8)}`;
}

/**
 * Upserts public identity fields on user_profiles from the auth user (OAuth metadata).
 * Call after login and before posting a review so FK user_ratings → user_profiles is satisfied.
 */
export async function syncUserProfileIdentity(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniqname = uniqnameFromUser(user);
  const avatar_url = reviewerAvatarUrlFromUser(user);
  const display_name = reviewerDisplayNameFromUser(user);
  const now = new Date().toISOString();

  const { data: existing, error: selErr } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selErr) {
    return { ok: false, error: selErr.message };
  }

  if (existing) {
    const { error } = await supabase
      .from("user_profiles")
      .update({
        uniqname,
        avatar_url,
        display_name,
        updated_at: now,
      })
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from("user_profiles").insert({
    user_id: user.id,
    dietary_filters: [],
    health_focus: 50,
    protein_priority: 50,
    rating_sensitivity: 50,
    streak_current: 0,
    streak_max: 0,
    onboarding_completed: false,
    uniqname,
    avatar_url,
    display_name,
    created_at: now,
    updated_at: now,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
