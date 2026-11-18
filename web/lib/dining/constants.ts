// lib/dining/constants.ts

export type DiningStatusColor = "green" | "red" | "orange" | "gray";

/** Badge `variant` names for live dining status. See docs/design-system.md. */
export type StatusBadgeVariant = "success" | "warning" | "danger" | "muted";

export const STATUS_COLORS: Record<DiningStatusColor, StatusBadgeVariant> = {
  green: "success",
  orange: "warning",
  red: "danger",
  gray: "muted",
};

export const CAPACITY_COLORS: Record<string, string> = {
  green: "text-green-600 dark:text-green-400",
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-600 dark:text-orange-400",
  slate: "text-muted-foreground",
};

export const CAPACITY_BG_COLORS: Record<string, string> = {
  green: "bg-green-500 dark:bg-green-500",
  red: "bg-red-500 dark:bg-red-500",
  orange: "bg-orange-500 dark:bg-orange-500",
  slate: "bg-muted-foreground/20",
};

export const LOCATION_TYPE_RANK = {
  DINING_HALL: 1,
  DINING_HALLS: 1,
  CAFE: 2,
  CAFES: 2,
  MARKET: 3,
  MARKETS: 3,
  UNKNOWN: 4
};

// --- DISPLAY HELPERS ---

export const getTypeForDisplay = (type: string) => {
  switch (type.toLowerCase()) {
    case 'dining halls': return 'Dining Hall';
    case 'cafes': return 'Café';
    case 'markets': return 'Market';
    case 'grills': return 'Grill';
    default: return 'Unknown';
  }
};

export const getPriority = (eventName: string) => {
  const name = (eventName || '').toLowerCase();
  if (name.includes('dinner')) return 1;
  if (name.includes('lunch')) return 2;
  if (name.includes('breakfast')) return 3;
  if (name.includes('brunch')) return 3;
  if (name.includes('standard')) return 4;
  return 10;
};

export const getTypeRank = (type: string): number => {
  // @ts-ignore - safe fallback
  return LOCATION_TYPE_RANK[type] || LOCATION_TYPE_RANK.UNKNOWN;
};
