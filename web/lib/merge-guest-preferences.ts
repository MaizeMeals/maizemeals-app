import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { UserPreferences } from "@/types/preferences";
import {
  UserPreferencesSchema,
  GUEST_PREFS_STORAGE_KEY,
  GUEST_ONBOARDING_STORAGE_KEY,
} from "@/types/preferences";

export const MAIZE_PREFERENCES_MERGED_EVENT = "maize-preferences-merged";

/**
 * After OAuth: if the profile is still in Tier 1 onboarding, copy guest localStorage
 * prefs into `user_profiles`, complete onboarding, and clear guest keys.
 */
export async function mergeGuestPreferencesIntoProfile(
  supabase: SupabaseClient<Database>,
): Promise<{ merged: boolean }> {
  if (typeof window === "undefined") return { merged: false };

  const raw = localStorage.getItem(GUEST_PREFS_STORAGE_KEY);
  if (!raw) return { merged: false };

  let guest: UserPreferences;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = UserPreferencesSchema.safeParse(parsed);
    if (!result.success) return { merged: false };
    guest = result.data;
  } catch {
    return { merged: false };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { merged: false };

  const { data: row, error: selErr } = await supabase
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (selErr || !row) return { merged: false };
  if (row.onboarding_completed !== false) return { merged: false };

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("user_profiles")
    .update({
      dietary_filters: guest.dietary_filters,
      health_focus: guest.health_focus,
      protein_priority: guest.protein_priority,
      rating_sensitivity: guest.rating_sensitivity,
      favorite_location_ids: guest.favorite_location_ids,
      default_campus: guest.default_campus ?? null,
      streak_current: guest.streak_current,
      last_played_at: guest.last_played_at ?? null,
      onboarding_completed: true,
      updated_at: now,
    })
    .eq("user_id", session.user.id);

  if (upErr) {
    console.error("[mergeGuestPreferencesIntoProfile]", upErr);
    return { merged: false };
  }

  localStorage.removeItem(GUEST_PREFS_STORAGE_KEY);
  localStorage.removeItem(GUEST_ONBOARDING_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(MAIZE_PREFERENCES_MERGED_EVENT));
  return { merged: true };
}
