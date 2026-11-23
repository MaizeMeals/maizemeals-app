import type { AdminClient } from "@/lib/admin/data";

export type FeedbackStatus = "new" | "read" | "done" | "archived";
export const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "read", "done", "archived"];

export type AdminFeedback = {
  id: string;
  createdAt: string;
  kind: string;
  message: string;
  status: FeedbackStatus;
  adminNote: string | null;
  pagePath: string | null;
  device: string | null;
  isInstalled: boolean;
  source: string;
  /** Signed-in sender, or null for guests. */
  user: { id: string; email: string | null; name: string | null } | null;
  /** Email a guest chose to leave. */
  contactEmail: string | null;
};

/** "Mozilla/5.0 (iPhone; …) … Safari" → "iPhone · Safari". Rough, for context only. */
export function describeDevice(ua: string | null): string | null {
  if (!ua) return null;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : null;
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  return [os, browser].filter(Boolean).join(" · ") || null;
}

export async function listFeedback(admin: AdminClient, status: FeedbackStatus | "all", limit = 200): Promise<AdminFeedback[]> {
  let query = admin
    .from("feedback")
    .select("id, created_at, kind, message, status, admin_note, page_path, user_agent, is_installed, source, user_id, contact_email")
    .order("created_at", { ascending: false })
    .limit(limit);
  query = status === "all" ? query.neq("status", "archived") : query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  // Senders: a handful of distinct accounts at most, so look them up one by one.
  const ids = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];
  const users = new Map<string, AdminFeedback["user"]>();
  await Promise.all(
    ids.map(async (id) => {
      const { data: u } = await admin.auth.admin.getUserById(id);
      const meta = (u.user?.user_metadata ?? {}) as Record<string, unknown>;
      users.set(id, {
        id,
        email: u.user?.email ?? null,
        name: typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null,
      });
    }),
  );

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    kind: r.kind,
    message: r.message,
    status: r.status as FeedbackStatus,
    adminNote: r.admin_note,
    pagePath: r.page_path,
    device: describeDevice(r.user_agent),
    isInstalled: r.is_installed,
    source: r.source,
    user: r.user_id ? users.get(r.user_id) ?? { id: r.user_id, email: null, name: null } : null,
    contactEmail: r.contact_email,
  }));
}

export async function countNewFeedback(admin: AdminClient): Promise<number> {
  const { count } = await admin.from("feedback").select("id", { count: "exact", head: true }).eq("status", "new");
  return count ?? 0;
}
