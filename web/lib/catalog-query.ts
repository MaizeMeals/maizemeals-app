/** Menus, halls, hours, and dishes. They change when the scraper runs, not on each click. */
export const CATALOG_STALE_TIME = 30 * 60 * 1000;
export const CATALOG_GC_TIME = 60 * 60 * 1000;

export const catalogQuery = {
  staleTime: CATALOG_STALE_TIME,
  gcTime: CATALOG_GC_TIME,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
} as const;

/** How busy a hall is. This one moves while the menu does not. */
export const CAPACITY_STALE_TIME = 30 * 1000;
