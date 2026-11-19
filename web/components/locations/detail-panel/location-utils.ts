import type { OperatingHour } from "@/types/dining";
import type { LocationSummary } from "@/types/location-summary";

/** Today's date in Eastern time as YYYY-MM-DD (keys of weeklyHours). */
export function easternDateKey(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function easternMinutesNow(now = new Date()): number {
  const [h, m] = now
    .toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false })
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Whether a shift on `dateKey` is happening right now (handles closing at midnight). */
export function isShiftNow(shift: Pick<OperatingHour, "start_time" | "end_time">, dateKey: string): boolean {
  if (dateKey !== easternDateKey()) return false;
  const start = toMinutes(shift.start_time);
  let end = toMinutes(shift.end_time);
  if (end <= start) end += 24 * 60;
  const now = easternMinutesNow();
  return now >= start && now < end;
}

/** Google Maps walking directions to a venue (address when known, else coordinates). */
export function directionsUrl(venue: Pick<LocationSummary, "lat" | "lng" | "name" | "contact">): string {
  const destination =
    venue.lat && venue.lng ? `${venue.lat},${venue.lng}` : (venue.contact?.address ?? `${venue.name}, Ann Arbor, MI`);
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(destination)}`;
}
