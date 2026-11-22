import { describe, expect, it } from "vitest";
import { addDays, buildScheduleNotice, type LocationDay } from "./schedule-notice";

const hall = (slug: string, name = slug) => ({ slug, name });
const many = (n: number) => Array.from({ length: n }, (_, i) => hall(`h${i}`, `Hall ${i}`));
const SQ = hall("south-quad-dining-hall", "South Quad Dining Hall");

/** Four normal weeks before `from`, 24 locations on weekdays. */
function history(from: string): LocationDay[] {
  const days: LocationDay[] = [];
  for (let i = 28; i >= 1; i--) days.push({ date: addDays(from, -i), halls: many(24) });
  return days;
}

describe("buildScheduleNotice", () => {
  it("is null on a normal week", () => {
    const today = "2026-11-22";
    const days = [...history(today), ...[0, 1, 2, 3].map((i) => ({ date: addDays(today, i), halls: many(23) }))];
    expect(buildScheduleNotice(days, today)).toBeNull();
  });

  it("describes Thanksgiving: a short Wednesday, then only South Quad", () => {
    const today = "2026-11-24"; // Tuesday
    const days = [
      ...history(today),
      { date: today, halls: many(23) },
      { date: "2026-11-25", halls: many(7) },
      { date: "2026-11-26", halls: [SQ] },
      { date: "2026-11-27", halls: [SQ] },
    ];
    const notice = buildScheduleNotice(days, today)!;
    expect(notice.title).toBe("Thanksgiving break");
    expect(notice.message).toBe(
      "Tomorrow is a short day: 7 of 24 locations are open. Thursday and Friday, only South Quad is open.",
    );
    expect(notice.link).toEqual({
      href: "/locations/south-quad-dining-hall?date=2026-11-26",
      label: "See South Quad’s menu",
    });
  });

  it("does not treat days the scraper hasn't reached as closed", () => {
    const today = "2026-11-24";
    const days = [...history(today), { date: today, halls: many(23) }];
    expect(buildScheduleNotice(days, today)).toBeNull();
  });

  it("keeps the same id for the same message", () => {
    const today = "2026-11-26";
    const days = [...history(today), { date: today, halls: [SQ] }];
    const a = buildScheduleNotice(days, today)!;
    const b = buildScheduleNotice(days, today)!;
    expect(a.message).toBe("Today, only South Quad is open.");
    expect(a.id).toBe(b.id);
  });
});
