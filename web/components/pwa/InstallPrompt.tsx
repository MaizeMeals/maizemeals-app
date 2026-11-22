"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { useAnalytics } from "@/hooks/use-analytics";
import { isIosSafari, isStandaloneDisplay } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "mm_install_prompt_dismissed_at";
const VIEWS_KEY = "mm_session_page_views";
const VISITS_KEY = "mm_visit_count";
const VISIT_COUNTED_KEY = "mm_visit_counted";
/** Fired when an item sheet opens (components/locations/slug/DetailDrawer). */
export const DISH_OPENED_EVENT = "mm:dish-opened";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/**
 * Ask only once someone has actually used the app: a second page view this
 * session, an opened dish, or a return visit. Never on a first look at the
 * landing page.
 */
const MIN_PAGE_VIEWS = 2;
const HIDDEN_ON = [/^\/login$/, /^\/signup$/, /^\/admin/];

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    /* private mode / storage blocked */
  }
}

function recentlyDismissed(): boolean {
  const raw = safeGet(localStorage, DISMISSED_KEY);
  return raw !== null && Date.now() - Number(raw) < SNOOZE_MS;
}

/**
 * "Add MaizeMeals to your home screen" card, shown above the bottom nav on
 * phones. Android/Chromium uses the native install prompt; iOS Safari gets
 * Share → Add to Home Screen instructions (it has no install API).
 */
export function InstallPrompt() {
  const pathname = usePathname() ?? "/";
  const { track } = useAnalytics();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"native" | "ios" | null>(null);
  const [engaged, setEngaged] = useState(false);

  // Return visits: count sessions, once per session.
  useEffect(() => {
    if (safeGet(sessionStorage, VISIT_COUNTED_KEY)) {
      if (Number(safeGet(localStorage, VISITS_KEY) ?? "0") >= 2) setEngaged(true);
      return;
    }
    safeSet(sessionStorage, VISIT_COUNTED_KEY, "1");
    const visits = Number(safeGet(localStorage, VISITS_KEY) ?? "0") + 1;
    safeSet(localStorage, VISITS_KEY, String(visits));
    if (visits >= 2) setEngaged(true);
  }, []);

  useEffect(() => {
    const onDish = () => setEngaged(true);
    window.addEventListener(DISH_OPENED_EVENT, onDish);
    return () => window.removeEventListener(DISH_OPENED_EVENT, onDish);
  }, []);

  // Count page views this session.
  useEffect(() => {
    const views = Number(safeGet(sessionStorage, VIEWS_KEY) ?? "0") + 1;
    safeSet(sessionStorage, VIEWS_KEY, String(views));
    if (views >= MIN_PAGE_VIEWS) setEngaged(true);
  }, [pathname]);

  useEffect(() => {
    if (isStandaloneDisplay() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("native");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIosSafari()) setMode("ios");

    const onInstalled = () => {
      setMode(null);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const visible = mode !== null && engaged && !HIDDEN_ON.some((re) => re.test(pathname));

  useEffect(() => {
    if (visible) track("pwa_install_prompt_shown", { mode });
  }, [visible, mode, track]);

  if (!visible) return null;

  const dismiss = () => {
    safeSet(localStorage, DISMISSED_KEY, String(Date.now()));
    track("pwa_install_prompt_dismissed", { mode });
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    track("pwa_install_prompt_clicked", { mode });
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    track("pwa_install_prompt_result", { outcome });
    setDeferred(null);
    if (outcome === "accepted") setMode(null);
    else dismiss();
  };

  return (
    <div
      role="dialog"
      aria-label="Install MaizeMeals"
      className="fixed inset-x-3 z-40 mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl animate-in slide-in-from-bottom-4 md:hidden"
      style={{ bottom: "calc(var(--bottom-nav-h, 0px) + 0.75rem)" }}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
        aria-label="Not now"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">Get the MaizeMeals app</p>
          {mode === "native" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Full screen, faster, and today&apos;s menus work with bad signal.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Tap <Share className="inline h-4 w-4 align-text-bottom" aria-label="Share" /> then{" "}
              <span className="whitespace-nowrap font-medium text-foreground">
                Add to Home Screen <SquarePlus className="inline h-4 w-4 align-text-bottom" aria-hidden />
              </span>
            </p>
          )}
        </div>
      </div>
      {mode === "native" && (
        <Button onClick={install} className={`${appPrimaryButtonClassName} mt-3 w-full`}>
          <Download className="mr-2 h-4 w-4" /> Install
        </Button>
      )}
    </div>
  );
}
