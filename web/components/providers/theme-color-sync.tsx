"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/** Keep in sync with the light/dark `themeColor` entries in app/layout.tsx. */
const COLORS = { light: "#ffffff", dark: "#0d0d0d" } as const;

/**
 * Android colors the status bar and (in the installed app) the system
 * navigation bar from <meta name="theme-color">. The static tags follow the
 * OS scheme; this rewrites them to the theme the app actually resolved, so an
 * in-app Light/Dark choice also recolors the system bars.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    const color = COLORS[resolvedTheme];
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (metas.length === 0) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
      return;
    }
    metas.forEach((meta) => {
      meta.content = color;
      meta.removeAttribute("media");
    });
  }, [resolvedTheme]);

  return null;
}
