"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mergeGuestPreferencesIntoProfile } from "@/lib/merge-guest-preferences";
import { toast } from "@/lib/toast";

/**
 * Keeps server-rendered UI in step with the auth cookie.
 *
 * The OAuth round trip can finish in another tab or browser window (the
 * installed Android app hands Google sign-in to Chrome), so the page you return
 * to was rendered signed out. Whenever the tab regains focus or Supabase
 * reports an auth change, compare the cookie's user with the one this page was
 * rendered for and refresh server components if they differ.
 */
export function AuthSync({ serverUserId }: { serverUserId: string | null }) {
  const router = useRouter();
  const known = useRef(serverUserId);
  // Last cookie user we refreshed for. If the server still disagrees after a
  // refresh (e.g. a token it rejects), don't refresh/toast again on every focus.
  const actedOn = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    known.current = serverUserId;
  }, [serverUserId]);

  useEffect(() => {
    const supabase = createClient();
    let checking = false;

    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const { data } = await supabase.auth.getSession();
        const id = data.session?.user.id ?? null;
        if (id === known.current || id === actedOn.current) return;
        actedOn.current = id;
        const wasSignedOut = known.current === null;
        known.current = id;
        if (wasSignedOut && id) {
          await mergeGuestPreferencesIntoProfile(supabase);
          // Same id as the ?signed_in=1 toast, so it never shows twice.
          toast.success("Signed in successfully", { id: "auth-sign-in-success", duration: 4500 });
        }
        router.refresh();
      } finally {
        checking = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void check();
    });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
