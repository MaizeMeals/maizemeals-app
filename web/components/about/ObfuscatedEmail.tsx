"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Shows "name [at] umich [dot] edu". The real address never appears in the
 * HTML (no mailto: href, no "@"); it's assembled only when someone clicks
 * Email or Copy, which keeps simple scrapers from harvesting it.
 */
function mailto(user: string, domain: string, subject?: string, body?: string): string {
  const address = [user, domain].join(String.fromCharCode(64));
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${address}${query ? `?${query}` : ""}`;
}

/** A button that opens a pre-filled email; the address is built only on click. */
export function EmailButton({
  user,
  domain = "umich.edu",
  subject,
  body,
  className,
  children,
}: {
  user: string;
  domain?: string;
  subject?: string;
  body?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = mailto(user, domain, subject, body);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

export function ObfuscatedEmail({
  user,
  domain = "umich.edu",
  subject,
  body,
  className,
}: {
  user: string;
  domain?: string;
  /** Pre-fills the subject line when someone clicks Email. */
  subject?: string;
  body?: string;
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
          window.location.href = mailto(user, domain, subject, body);
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
