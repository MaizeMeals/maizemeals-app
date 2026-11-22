/**
 * Break / closure notice for the landing page ("Thanksgiving break: Thursday
 * and Friday, only South Quad is open."), worked out from the menus the
 * scraper already saves: a day is "reduced" when far fewer locations have a
 * menu than on the same weekday in recent weeks. No holiday calendar needed.
 */

export type LocationDay = {
  date: string;
  halls: { name: string; slug: string }[];
};

export type ScheduleNotice = {
  /** Stable for a given message, so a dismissal sticks until it changes. */
  id: string;
  title: string;
  message: string;
  link: { href: string; label: string } | null;
};

/** How many days ahead (including today) the notice looks. */
export const NOTICE_LOOKAHEAD_DAYS = 5;
/** Weeks of history used for the "usual" count. */
export const NOTICE_BASELINE_WEEKS = 4;
/** A day is reduced below this share of its usual count. */
const REDUCED_SHARE = 0.5;
/** Name the open locations when this few are open. */
const NAME_UP_TO = 3;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days, 12));
  return t.toISOString().slice(0, 10);
}

function weekday(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}

function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return weekday(date);
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** "South Quad Dining Hall" → "South Quad". */
export function shortHallName(name: string): string {
  return name.replace(/\s+Dining Hall$/i, "").trim();
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function breakTitle(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  if (m === 11 && d >= 20) return "Thanksgiving break";
  if ((m === 12 && d >= 15) || (m === 1 && d <= 10)) return "Winter break";
  return "Reduced dining schedule";
}

function hashId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * `days` holds every date that has at least one menu (from the baseline
 * window through the lookahead). Dates after the last one in `days` are not
 * scraped yet, so they never count as closed.
 */
export function buildScheduleNotice(days: LocationDay[], today: string): ScheduleNotice | null {
  if (days.length === 0) return null;
  const byDate = new Map(days.map((d) => [d.date, d.halls]));
  const lastScraped = days.reduce((max, d) => (d.date > max ? d.date : max), days[0].date);

  type Reduced = { date: string; halls: LocationDay["halls"]; usual: number };
  const reduced: Reduced[] = [];
  for (let i = 0; i < NOTICE_LOOKAHEAD_DAYS; i++) {
    const date = addDays(today, i);
    if (date > lastScraped) break;
    const history: number[] = [];
    for (let w = 1; w <= NOTICE_BASELINE_WEEKS; w++) {
      const past = byDate.get(addDays(date, -7 * w));
      if (past) history.push(past.length);
    }
    if (history.length < 2) continue;
    const usual = median(history);
    if (usual < 6) continue;
    const halls = byDate.get(date) ?? [];
    if (halls.length < usual * REDUCED_SHARE) reduced.push({ date, halls, usual });
  }
  if (reduced.length === 0) return null;

  // Group back-to-back days that have the same few locations open.
  const sentences: string[] = [];
  let link: ScheduleNotice["link"] = null;
  for (let i = 0; i < reduced.length; ) {
    const day = reduced[i];
    const few = day.halls.length <= NAME_UP_TO;
    const sameSet = (other: Reduced) =>
      other.halls.map((h) => h.slug).join("|") === day.halls.map((h) => h.slug).join("|");
    let j = i + 1;
    if (few) {
      while (
        j < reduced.length &&
        reduced[j].date === addDays(reduced[j - 1].date, 1) &&
        sameSet(reduced[j])
      ) {
        j++;
      }
    }
    const when = joinList(reduced.slice(i, j).map((d) => dayLabel(d.date, today)));
    if (day.halls.length === 0) {
      sentences.push(`${when}, no dining locations have menus.`);
    } else if (few) {
      const names = joinList(day.halls.map((h) => shortHallName(h.name)));
      sentences.push(`${when}, only ${names} ${day.halls.length === 1 ? "is" : "are"} open.`);
      if (!link && day.halls.length === 1) {
        const hall = day.halls[0];
        link = {
          href: `/locations/${hall.slug}?date=${day.date}`,
          label: `See ${shortHallName(hall.name)}’s menu`,
        };
      }
    } else {
      sentences.push(
        `${when} is a short day: ${day.halls.length} of ${Math.round(day.usual)} locations are open.`,
      );
    }
    i = j;
  }

  const message = sentences.join(" ");
  return {
    id: hashId(message),
    title: breakTitle(reduced[0].date),
    message,
    link: link ?? { href: "/locations", label: "See what’s open" },
  };
}
