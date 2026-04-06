// lib/dining/constants.ts

export type DiningStatusColor = "green" | "red" | "orange" | "gray";

// --- COLORS ---

// 1. Primitive definitions (Source of Truth)
const STATUS_PRIMITIVES = {
  green: {
    text: "text-green-700 dark:text-green-200",
    bg: "bg-green-100 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
  },
  red: {
    text: "text-red-700 dark:text-red-200",
    bg: "bg-red-100 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
  },
  orange: {
    text: "text-orange-800 dark:text-orange-200",
    bg: "bg-orange-100 dark:bg-orange-950",
    border: "border-orange-200 dark:border-orange-800",
  },
  gray: {
    text: "text-slate-700 dark:text-slate-200",
    bg: "bg-slate-100 dark:bg-slate-950",
    border: "border-slate-200 dark:border-slate-800",
  },
};

// 2. Exported Composites
export const STATUS_COLORS: Record<DiningStatusColor, string> = {
  green: `${STATUS_PRIMITIVES.green.bg} ${STATUS_PRIMITIVES.green.text} ${STATUS_PRIMITIVES.green.border}`,
  red: `${STATUS_PRIMITIVES.red.bg} ${STATUS_PRIMITIVES.red.text} ${STATUS_PRIMITIVES.red.border}`,
  orange: `${STATUS_PRIMITIVES.orange.bg} ${STATUS_PRIMITIVES.orange.text} ${STATUS_PRIMITIVES.orange.border}`,
  gray: `${STATUS_PRIMITIVES.gray.bg} ${STATUS_PRIMITIVES.gray.text} ${STATUS_PRIMITIVES.gray.border}`,
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
