import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient, getAdminUserIds } from "@/lib/supabase/admin";

/**
 * Env (production): CRON_SECRET, RESEND_API_KEY, RESEND_FROM (verified sender),
 * SUPABASE_KEY, NEXT_PUBLIC_SUPABASE_URL, ADMIN_USER_IDS.
 * Optional: APP_BASE_URL or NEXT_PUBLIC_SITE_URL for links (else VERCEL_URL / localhost).
 */

function constantTimeEqualString(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function verifyCronBearer(request: Request, secret: string | undefined): boolean {
  if (!secret?.length) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length).trim();
  return constantTimeEqualString(token, secret);
}

function getAppBaseUrl(): string {
  const explicit =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

export async function GET(request: Request) {
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (isProd && !process.env.CRON_SECRET?.trim()) {
    console.error("[daily-digest] CRON_SECRET is not set in production");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!verifyCronBearer(request, process.env.CRON_SECRET)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[daily-digest] Supabase admin client:", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { count, error: countError } = await admin
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("is_approved", false);

  if (countError) {
    console.error("[daily-digest] photos count:", countError);
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const pending = count ?? 0;
  if (pending === 0) {
    return NextResponse.json({ message: "No pending tasks. Skipping email." });
  }

  const adminIds = getAdminUserIds();
  const emails = new Set<string>();
  for (const id of adminIds) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error) {
      console.error(`[daily-digest] getUserById ${id}:`, error);
      continue;
    }
    const email = data.user?.email?.trim();
    if (email) emails.add(email);
  }

  if (emails.size === 0) {
    console.warn("[daily-digest] No admin emails resolved from ADMIN_USER_IDS");
    return NextResponse.json({
      message: "No admin recipients. Skipping email.",
      pendingCount: pending,
    });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = process.env.RESEND_FROM?.trim();
  if (isProd && (!resendKey || !resendFrom)) {
    console.error("[daily-digest] RESEND_API_KEY or RESEND_FROM missing in production");
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }
  if (!resendKey || !resendFrom) {
    return NextResponse.json(
      { error: "RESEND_API_KEY and RESEND_FROM required to send" },
      { status: 500 },
    );
  }

  const base = getAppBaseUrl();
  const reviewUrl = `${base}/admin/photos`;
  const subject = `Action required: ${pending} pending photo${pending === 1 ? "" : "s"} on MaizeMeals`;
  const html = `
    <h2>Daily admin digest</h2>
    <p>You have <strong>${pending}</strong> user-submitted photo${pending === 1 ? "" : "s"} waiting for moderation.</p>
    <p><a href="${reviewUrl}">Review photos</a></p>
  `;

  try {
    const resend = new Resend(resendKey);
    const { error: sendError } = await resend.emails.send({
      from: resendFrom,
      to: [...emails],
      subject,
      html,
    });
    if (sendError) {
      console.error("[daily-digest] Resend:", sendError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      notifiedCount: pending,
      recipientCount: emails.size,
    });
  } catch (err) {
    console.error("[daily-digest] Resend exception:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
