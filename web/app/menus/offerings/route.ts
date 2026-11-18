import { NextResponse, type NextRequest } from "next/server";
import { getDayMenu } from "@/lib/day-menu/server";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /menus/offerings?date=YYYY-MM-DD → DayMenu (public menu data for every
 * location on that date). Lives outside /api so the service worker caches it
 * for offline use.
 */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!DATE_REGEX.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD is required" }, { status: 400 });
  }

  try {
    const menu = await getDayMenu(date);
    return NextResponse.json(menu, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (err) {
    console.error("[menus/offerings] failed", err);
    return NextResponse.json({ error: "Could not load menus." }, { status: 500 });
  }
}
