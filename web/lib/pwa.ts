/** Client-side PWA helpers. Safe to import from client components only. */

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari home-screen apps
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; touch support gives it away.
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // In-app browsers and Chrome/Firefox on iOS can't add to home screen the same way.
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Snapchat/.test(ua);
  return isIos && !isOtherBrowser;
}

/**
 * Drop cached pages and menu data (they can include the signed-in user's
 * header, macros page, or personalized ranking) — call on sign-out.
 */
export function clearUserCaches(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_USER_CACHES" });
}
