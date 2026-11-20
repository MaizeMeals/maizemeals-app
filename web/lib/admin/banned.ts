import type { User } from "@supabase/supabase-js";

/** True while an admin suspension is in effect for this user. */
export function userIsSuspended(user: User | null | undefined): boolean {
  const until = (user as (User & { banned_until?: string | null }) | null | undefined)?.banned_until;
  return Boolean(until && new Date(until).getTime() > Date.now());
}

export const SUSPENDED_MESSAGE = "Your account is suspended, so you can't post or edit reviews right now.";
