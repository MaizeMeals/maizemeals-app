"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Shows "name [at] umich [dot] edu". The real address never appears in the
 * HTML (no mailto: href, no "@"); it's assembled only when someone clicks
 * Email or Copy, which keeps simple scrapers from harvesting it.
 */
export function ObfuscatedEmail({
  user,
  domain = "umich.edu",
  className,
}: {
  user: string;
  domain?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [host, ...rest] = domain.split(".");
  const shown = `${user} [at] ${host}${rest.map((r) => ` [dot] ${r}`).join("")}`;
  const address = () => [user, domain].join(String.fromCharCode(64));

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <span className="font-mono text-sm">{shown}</span>
      <button
        type="button"
        onClick={() => {
          window.location.href = `mailto:${address()}`;
        }}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
        aria-label={`Email ${user}`}
      >
        <Mail className="h-3.5 w-3.5" aria-hidden /> Email
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard blocked: the spelled-out address is still on screen.
          }
        }}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
        aria-label={`Copy ${user}'s email address`}
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
