"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export const GUEST_LOGIN_CTA_DISMISSED_KEY =
  "maize_guest_smart_prefs_login_cta_dismissed";

type GuestLoginPreferencesBannerProps = {
  visible: boolean;
  loginHref: string;
  onDismiss: () => void;
};

export function GuestLoginPreferencesBanner({
  visible,
  loginHref,
  onDismiss,
}: GuestLoginPreferencesBannerProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2.5 text-sm",
        "md:px-4",
      )}
      role="region"
      aria-label="Sign in for saved preferences"
    >
      <p className="min-w-0 flex-1 text-foreground font-medium">
        Sign in to tune smart rankings and keep them on every device.
      </p>
      <Button
        asChild
        size="sm"
        className={cn("shrink-0 font-semibold", appPrimaryButtonClassName)}
      >
        <Link href={loginHref}>Log in</Link>
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
