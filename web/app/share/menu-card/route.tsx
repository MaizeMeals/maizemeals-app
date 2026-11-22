import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getDayMenu } from "@/lib/day-menu/server";
import { currentOrNextShift, easternMinutes, easternToday, formatClock } from "@/lib/day-menu/scoring";

import { featuredDish } from "@/lib/day-menu/featured-dish";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const date = easternToday(now);
  const [photo, menu] = await Promise.all([
    readFile(path.join(process.cwd(), "public/images/dining_halls/east-quad-dining-hall.jpg")),
    getDayMenu(date),
  ]);
  const hall = menu.halls.find((h) => h.slug === "east-quad-dining-hall");
  const shift = hall && currentOrNextShift(hall, easternMinutes(now));
  const meal = shift && shift.kind !== "closed" ? shift : null;
  const dish = hall && meal && featuredDish(menu.items.filter(
    (item) => item.hallId === hall.id && item.meals.includes(meal.meal),
  ));

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#00274c", color: "white" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 720, padding: 56 }}>
        <span style={{ fontSize: 36, color: "#ffcb05" }}>MaizeMeals</span>
        <span style={{ fontSize: 30, marginTop: 44 }}>East Quad Dining Hall</span>
        <span style={{ fontSize: 58, marginTop: 12 }}>{dish?.name ?? "What’s on the menu at U-M?"}</span>
        <span style={{ fontSize: 26, marginTop: 28 }}>{meal ? `${date} · ${meal.meal} · ${formatClock(meal.shift.start)}–${formatClock(meal.shift.end)}` : "Dining menus & serving hours"}</span>
      </div>
      {/* ImageResponse embeds these bytes in the PNG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" width="480" height="630" style={{ objectFit: "cover" }} src={`data:image/jpeg;base64,${photo.toString("base64")}`} />
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } },
  );
}
