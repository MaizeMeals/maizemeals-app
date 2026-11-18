"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

import { useAnalytics } from "@/hooks/use-analytics";

import Logo from "@/components/branding/Logo";
import {
  HEADER_CHROME_BASE,
  HEADER_HEIGHT,
  HEADER_HEIGHT_PX,
  HEADER_TRANSPARENT_SURFACE,
} from "@/components/layout/constants";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/UserNav";

const MD_UP_QUERY = "(min-width: 768px)";

function subscribeMdUp(onChange: () => void) {
  const mq = window.matchMedia(MD_UP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMdUpSnapshot() {
  return window.matchMedia(MD_UP_QUERY).matches;
}

interface HeaderContentProps {
  user: User | null;
  signOut: () => Promise<void>;
  /** From server: `ADMIN_USER_IDS` includes this user. */
  isAdmin?: boolean;
}

export function HeaderContent({ user, signOut, isAdmin = false }: HeaderContentProps) {
  const { track } = useAnalytics();
  const [isScrolled, setIsScrolled] = useState(false);
  /** Auth uses the glass/transparent header only at `md+`; mobile uses normal themed chrome. */
  const isMdUp = useSyncExternalStore(subscribeMdUp, getMdUpSnapshot, () => false);
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const isLocationPage = pathname.startsWith("/locations/");
  const isAuthPage =
    pathname === "/login" || pathname === "/signup";

  const handleNavLinkClick = (
    linkName: string,
    linkHref: string,
    isMobile: boolean,
  ) => {
    track("nav_link_clicked", {
      link_name: linkName,
      link_href: linkHref,
      is_mobile: isMobile,
      current_page: pathname,
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isAuthPage) {
        setIsScrolled(false);
        return;
      }
      // Landing page: Full screen video -> Threshold ~ 100vh
      // Location page: 40vh hero (min 300px) -> Threshold ~ height - header
      const heroHeight = isLocationPage
        ? Math.max(window.innerHeight * 0.4, 300)
        : window.innerHeight;

      const threshold = heroHeight - HEADER_HEIGHT_PX;

      setIsScrolled(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthPage, isLocationPage]);

  const navLinks = [
    { name: "Find food", href: "/menus" },
    { name: "Locations", href: "/locations" },
    { name: "Nutrition", href: "/nutrition" },
    ...(isAdmin ? [{ name: "Admin", href: "/admin" } as const] : []),
  ];

  // Transparent hero-style bar: landing/location, or auth at `md+` only (mobile auth = themed header)
  const isTransparent =
    (isAuthPage && isMdUp) ||
    (!isAuthPage && (isLandingPage || isLocationPage) && !isScrolled);

  return (
    <header
      className={cn(
        !isTransparent
          ? cn(
              HEADER_CHROME_BASE,
              "bg-background border-border border-b shadow-sm",
            )
          : isAuthPage
            ? "fixed top-0 z-50 w-full border-b border-white/10 bg-transparent transition-all duration-300 transform-gpu"
            : cn(HEADER_CHROME_BASE, HEADER_TRANSPARENT_SURFACE),
      )}
    >
      <div
        className="container mx-auto flex items-center justify-between px-4 md:px-6"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-6">
          <Logo forceWhite={isTransparent} />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => handleNavLinkClick(link.name, link.href, false)}
                className={cn(
                  "transition-colors",
                  !isTransparent
                    ? "hover:text-maize text-foreground/80"
                    : "hover:text-maize text-white/90",
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle forceWhite={isTransparent} />
          <UserNav
            user={user}
            signOut={signOut}
            forceWhite={isTransparent}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </header>
  );
}
