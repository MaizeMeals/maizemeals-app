"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, MapPin, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";

const TABS = [
  { name: "Food", href: "/menus", icon: Search, match: (p: string) => p.startsWith("/menus") || p.startsWith("/reviews") },
  { name: "Places", href: "/locations", icon: MapPin, match: (p: string) => p.startsWith("/locations") },
  { name: "Macros", href: "/nutrition", icon: Flame, match: (p: string) => p.startsWith("/nutrition") },
  {
    name: "Me",
    href: "/settings",
    icon: User,
    match: (p: string) => p.startsWith("/settings") || p === "/login" || p === "/signup",
  },
] as const;

/** Routes with their own full-screen chrome. */
const HIDDEN_ON = [/^\/login$/, /^\/signup$/, /^\/admin/];

/**
 * Mobile tab bar (hidden at md+). Its presence sets `--bottom-nav-h` via
 * `:root:has(#mm-bottom-nav)` in globals.css, which pages and fixed drawers
 * use to keep content clear of it.
 */
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const { track } = useAnalytics();

  if (HIDDEN_ON.some((re) => re.test(pathname))) return null;

  return (
    <nav
      id="mm-bottom-nav"
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-14 max-w-md items-stretch justify-around">
        {TABS.map(({ name, href, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => track("bottom_nav_clicked", { tab: name.toLowerCase(), from: pathname })}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-umich-blue dark:text-maize" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden />
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
