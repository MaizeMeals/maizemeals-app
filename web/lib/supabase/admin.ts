import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

/**
 * Server-only Supabase client using the service role key.
 * Use only in API routes or server code after verifying the request is from an admin.
 * Requires SUPABASE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_KEY");
  }
  return createClient<Database>(url, key);
}

const ADMIN_USER_IDS_KEY = "ADMIN_USER_IDS";

/** Comma-separated list of user UUIDs allowed to access admin routes. */
export function isAdminUserId(userId: string): boolean {
  const raw = process.env[ADMIN_USER_IDS_KEY];
  if (!raw?.trim()) return false;
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.includes(userId);
}
