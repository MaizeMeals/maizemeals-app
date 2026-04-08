/** Header height — must match the inner div in HeaderContent (h-16 = 4rem). */
export const HEADER_HEIGHT = "4rem";

/** Header height in pixels (for JS calculations, e.g. scroll threshold). 4rem = 64px at 16px root. */
export const HEADER_HEIGHT_PX = 64;

/**
 * Motion + isolation + backdrop GPU hints — always on hero `<header>` and auth glass panel.
 */
export const HEADER_BACKDROP_STACK =
  "transition-all duration-300 transform-gpu isolate will-change-[backdrop-filter] backface-hidden" as const;

/**
 * Backdrop GPU hints without `transition-all` — used for auth viewport glass so `clip-path`
 * resizes snap instead of animating over 300ms.
 */
export const AUTH_GLASS_BACKDROP_STACK =
  "transform-gpu isolate will-change-[backdrop-filter] backface-hidden" as const;

/** Full fixed header shell = position + HEADER_BACKDROP_STACK. */
export const HEADER_CHROME_BASE =
  `fixed top-0 z-50 w-full ${HEADER_BACKDROP_STACK}` as const;

/**
 * Transparent hero bar tint + blur — HeaderContent when `isTransparent` (line 109).
 * Use for auth glass panel so it matches the header exactly.
 */
export const HEADER_TRANSPARENT_SURFACE =
  "bg-black/30 backdrop-blur-xl backdrop-saturate-150 border-white/10" as const;

/**
 * Base glass layer for `/login` + `/signup`: one backdrop-filter so the header and auth
 * column share continuous blur (no seam). Tint/blur matches HEADER_TRANSPARENT_SURFACE.
 *
 * On `md+`, `AuthPage` sets a `clip-path`: full width under the header, left 50% of the
 * viewport below (aligned with the `md:w-1/2` sidebar). Below `md`, no clip — full viewport.
 */
export const AUTH_UNIFIED_GLASS_BASE =
  `${AUTH_GLASS_BACKDROP_STACK} pointer-events-none fixed inset-0 z-[1] bg-black/30 backdrop-blur-xl backdrop-saturate-150` as const;
