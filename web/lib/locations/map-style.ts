const MAPTILER_STYLES = {
  light: "dataviz-v4",
  dark: "019c7246-db79-7039-ad61-ed0035a09174",
} as const;

// Used when NEXT_PUBLIC_MAPTILER_KEY isn't set (local dev, keyless previews).
const OPENFREEMAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export function mapStyleUrl(theme: string | undefined) {
  const mode = theme === "light" ? "light" : "dark";
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) return OPENFREEMAP_STYLES[mode];
  return `https://api.maptiler.com/maps/${MAPTILER_STYLES[mode]}/style.json?key=${key}`;
}
