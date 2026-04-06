/**
 * Shared utilities for displaying location/venue names consistently:
 * - Main name: building/location only (e.g. "East Quad", "Pierpont")
 * - Short label: type or venue part only (e.g. "Dining Hall", "Blue Cafe & Market")
 */

import { getTypeForDisplay } from "@/lib/dining";

// Type phrases that can appear at the end of a full name (e.g. "East Quad Dining Hall")
const TYPE_SUFFIXES = [
  " Dining Hall",
  " Cafe",
  " Café",
  " Market",
  " Blue Market",
  " Cafe & Market",
  " Blue cafe & Market",
  " Grill",
];

// Type phrases that can appear at the start (e.g. "Blue Market Pierpont")
const TYPE_PREFIXES = ["Blue Market "];

function stripSuffix(s: string): string {
  const t = s.trim();
  for (const suffix of TYPE_SUFFIXES) {
    if (t.endsWith(suffix)) return t.slice(0, -suffix.length).trim();
  }
  return t;
}

function stripPrefix(s: string): string {
  const t = s.trim();
  for (const prefix of TYPE_PREFIXES) {
    if (t.toLowerCase().startsWith(prefix.toLowerCase()))
      return t.slice(prefix.length).trim();
  }
  return t;
}

/**
 * Returns the main/location name with type identifier removed.
 * - "East Quad Dining Hall" → "East Quad"
 * - "Blue Market Pierpont" → "Pierpont"
 * - "Mojo Blue cafe & Market" → "Mojo"
 */
export function getMainName(fullName: string): string {
  if (!fullName?.trim()) return fullName ?? "";
  let s = fullName.trim();
  s = stripSuffix(s);
  s = stripPrefix(s);
  return s || fullName.trim();
}

/**
 * Returns the short label: full name with the main name removed (for tabs/pins).
 * - "East Quad Dining Hall" with main "East Quad" → "Dining Hall"
 * - "Blue Market Pierpont" with main "Pierpont" → "Blue Market"
 * - "Mojo Blue cafe & Market" with main "Mojo" → "Blue Cafe & Market"
 * If mainName is omitted, it is derived from fullName via getMainName().
 */
export function getShortLabel(fullName: string, mainName?: string): string {
  if (!fullName?.trim()) return fullName ?? "";
  const main = mainName ?? getMainName(fullName);
  if (!main) return fullName.trim();
  const f = fullName.trim();
  // Prefer stripping from start, then end (handles "East Quad Dining Hall" and "Mojo Blue cafe & Market")
  if (f.toLowerCase().startsWith(main.toLowerCase() + " "))
    return f.slice(main.length).trim();
  if (f.toLowerCase().endsWith(" " + main.toLowerCase()))
    return f.slice(0, -(main.length + 1)).trim();
  return f;
}

/**
 * Label for a venue in a multi-venue picker (dropdown).
 * Uses {@link getShortLabel} when it differs from the building name; otherwise
 * falls back to the venue type (e.g. "Dining Hall" when the name is only "East Quad").
 */
export function getVenuePickerLabel(
  venueName: string,
  clusterMainName: string,
  venueType: string,
): string {
  const short = getShortLabel(venueName, clusterMainName).trim();
  const cluster = clusterMainName.trim();
  if (short && short.toLowerCase() !== cluster.toLowerCase()) {
    return short;
  }
  return getTypeForDisplay(venueType.replace(/_/g, " "));
}
