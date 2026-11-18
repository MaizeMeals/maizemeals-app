import { describe, expect, it } from "vitest";
import { shiftBoundsOnDay } from "./status";

describe("shiftBoundsOnDay", () => {
  it("ends a 22:00–02:00 shift on the next day and leaves the input date alone", () => {
    const day = new Date(2026, 0, 15, 15, 30, 45, 123);
    const snapshot = day.getTime();

    const { start, end } = shiftBoundsOnDay("22:00", "02:00", day);

    expect(start).toEqual(new Date(2026, 0, 15, 22, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 0, 16, 2, 0, 0, 0));
    expect(day.getTime()).toBe(snapshot);
  });

  it("keeps an 11:00–14:00 shift on the same day", () => {
    const day = new Date(2026, 0, 15, 8, 0, 0, 0);
    const snapshot = day.getTime();

    const { start, end } = shiftBoundsOnDay("11:00", "14:00", day);

    expect(start).toEqual(new Date(2026, 0, 15, 11, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 0, 15, 14, 0, 0, 0));
    expect(day.getTime()).toBe(snapshot);
  });

  it("spans 24 hours for 00:00–00:00", () => {
    const day = new Date(2026, 0, 15, 12, 0, 0, 0);
    const snapshot = day.getTime();

    const { start, end } = shiftBoundsOnDay("00:00", "00:00", day);

    expect(start).toEqual(new Date(2026, 0, 15, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 0, 16, 0, 0, 0, 0));
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(day.getTime()).toBe(snapshot);
  });
});
