// lib/dining/formatters.ts

import { LocationSummary } from "@/types/location-summary";

export const formatTime = (timeStr: string) => {
  if (!timeStr) return "--";
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
};

export function cleanLocationName(name: string, type: string) {
  if (!name || !type) return name;
  if (type === "CAFES" || type === "MARKETS" || type === "GRILLS") return name;

  const singularType = type.replace(/s$/i, ""); // "DINING HALLS" -> "DINING HALL"
  const regex = new RegExp(singularType, "gi");

  return name
    .replace(regex, "")
    .replace(/\s+/g, " ")
    .trim();
}


/**
 * Smart Label Generator
 * Returns "Market", "Cafe", or the specific name depending on redundancy.
 * e.g. If parent is "Bursley" and venue is "Bursley Blue Market", returns "Blue Market"
 */
export const getLocationLabel = (venue: LocationSummary, parentName?: string): string => {
  // 1. Dining Halls are always just "Dining Hall" in the context of a specific building card
  if (venue.type === 'DINING_HALLS') return "Dining Hall";

  // 2. If the name exactly matches the parent (e.g. "Bursley" inside "Bursley"), use the Type
  if (parentName && venue.name === parentName) {
    return venue.type === 'CAFES' ? "Cafe" : "Market";
  }

  // 3. Otherwise return the real name (e.g. "Mojo Blue Market")
  return venue.name;
};
