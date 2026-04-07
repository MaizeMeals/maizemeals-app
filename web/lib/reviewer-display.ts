import type { User } from "@supabase/supabase-js";

/** "Jane D." from OAuth full_name / name; falls back to email local part or "Student". */
export function reviewerDisplayNameFromUser(user: User): string {
  const meta = user.user_metadata || {};
  const raw =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const lastInitial = parts[parts.length - 1]?.charAt(0).toUpperCase() ?? "";
    return `${first} ${lastInitial}.`;
  }
  if (parts.length === 1) return parts[0];
  const local = user.email?.split("@")[0];
  if (local) return local;
  return "Student";
}

export function reviewerAvatarUrlFromUser(user: User): string | null {
  const meta = user.user_metadata || {};
  const url =
    (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
    (typeof meta.picture === "string" && meta.picture.trim()) ||
    null;
  return url || null;
}
