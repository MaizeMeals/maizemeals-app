"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { isStandaloneDisplay } from "@/lib/pwa";

/**
 * Registers /sw.js in production and records how the app was opened
 * (browser tab vs. installed PWA) so we can measure install adoption.
 */
export function ServiceWorkerRegistrar() {
  const posthog = usePostHog();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => console.error("[pwa] service worker registration failed", err));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  useEffect(() => {
    if (!posthog) return;
    const standalone = isStandaloneDisplay();
    posthog.register({ display_mode: standalone ? "standalone" : "browser" });
    if (standalone) posthog.capture("pwa_opened");

    const onInstalled = () => posthog.capture("pwa_installed");
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [posthog]);

  return null;
}
