"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { mergeGuestPreferencesIntoProfile } from "@/lib/merge-guest-preferences";

const SIGNED_IN_PARAM = "signed_in";

function SignInSuccessToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get(SIGNED_IN_PARAM) !== "1") return;
    fired.current = true;

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      await mergeGuestPreferencesIntoProfile(supabase);
      if (cancelled) return;

      toast.success("Signed in successfully", {
        id: "auth-sign-in-success",
        duration: 4500,
      });

      const next = new URLSearchParams(searchParams.toString());
      next.delete(SIGNED_IN_PARAM);
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, pathname]);

  return null;
}

export function SignInSuccessToast() {
  return (
    <Suspense fallback={null}>
      <SignInSuccessToastInner />
    </Suspense>
  );
}
