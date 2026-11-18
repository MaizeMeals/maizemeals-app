import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * POST /api/revalidate — drop the cached day menu after a scrape.
 * Authorization: Bearer CRON_SECRET, compared the same way as the daily digest.
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

export async function POST(request: Request) {
  if (!verifyCronBearer(request, process.env.CRON_SECRET)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // expire: 0 drops the tag now. A named profile such as "max" only marks
  // unstable_cache entries stale, so /menus/offerings would keep serving them.
  revalidateTag("day-menu", { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
