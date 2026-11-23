"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackKind = "idea" | "bug" | "praise" | "other";
export type FeedbackSource = "link" | "prompt" | "settings";

export type FeedbackInput = {
  kind: FeedbackKind;
  message: string;
  contactEmail?: string;
  pagePath?: string;
  isInstalled?: boolean;
  source?: FeedbackSource;
  /** Honeypot: real people leave this empty. */
  website?: string;
};

export type FeedbackResult = { success: true } | { success: false; error: string };

const KINDS: FeedbackKind[] = ["idea", "bug", "praise", "other"];
const SOURCES: FeedbackSource[] = ["link", "prompt", "settings"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Per device/network: a burst limit and a daily cap. */
const LIMITS = [
  { windowMs: 10 * 60_000, max: 3 },
  { windowMs: 24 * 3_600_000, max: 15 },
];

function clientHash(ip: string): string {
  const salt = process.env.FEEDBACK_SALT || process.env.SUPABASE_KEY || "maizemeals";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

/** Anyone can send feedback; signed-in users are linked to their account. */
export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  // Bots that fill every field get a quiet "success".
  if (input.website) return { success: true };

  const message = (input.message ?? "").trim();
  if (message.length < 3) return { success: false, error: "Tell us a little more first." };
  if (message.length > 2000) return { success: false, error: "Please keep it under 2,000 characters." };
  const kind = KINDS.includes(input.kind) ? input.kind : "other";
  const source = input.source && SOURCES.includes(input.source) ? input.source : "link";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let contactEmail: string | null = null;
  if (!user && input.contactEmail?.trim()) {
    contactEmail = input.contactEmail.trim().slice(0, 254);
    if (!EMAIL_RE.test(contactEmail)) return { success: false, error: "That email address doesn't look right." };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const hash = clientHash(ip);
  const admin = createAdminClient();

  for (const limit of LIMITS) {
    const since = new Date(Date.now() - limit.windowMs).toISOString();
    const { count } = await admin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("client_hash", hash)
      .gte("created_at", since);
    if ((count ?? 0) >= limit.max) {
      return { success: false, error: "Thanks! You've sent a lot of feedback recently. Try again a bit later." };
    }
  }

  const pagePath = input.pagePath?.startsWith("/") ? input.pagePath.slice(0, 300) : null;
  const { error } = await admin.from("feedback").insert({
    user_id: user?.id ?? null,
    kind,
    message,
    contact_email: contactEmail,
    page_path: pagePath,
    user_agent: (h.get("user-agent") ?? "").slice(0, 400) || null,
    is_installed: Boolean(input.isInstalled),
    source,
    client_hash: hash,
  });
  if (error) {
    console.error("[feedback] insert failed:", error.message);
    return { success: false, error: "Couldn't send that. Please try again." };
  }
  return { success: true };
}
