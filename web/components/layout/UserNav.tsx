"use client";

import { useRef } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, Settings, LogOut, ChevronDown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthEntryLink } from "@/components/auth/AuthEntryLink";
import { useAnalytics } from "@/hooks/use-analytics";
import { clearUserCaches } from "@/lib/pwa";
import {
  appGhostTextButtonClassName,
  appPrimaryButtonClassName,
} from "@/lib/button-styles";

interface UserNavProps {
  user: User | null;
  signOut: () => Promise<void>;
  forceWhite?: boolean;
  isAdmin?: boolean;
}

export function UserNav({ user, signOut, forceWhite = false, isAdmin = false }: UserNavProps) {
  const signOutFormRef = useRef<HTMLFormElement>(null);
  const { track, reset } = useAnalytics();

  const handleLogout = () => {
    if (typeof track === "function") {
      track("logout_clicked");
    }
    reset();
    clearUserCaches();
    signOutFormRef.current?.requestSubmit();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className={cn(
            "hidden sm:inline-flex",
            forceWhite
              ? "text-white/90 hover:bg-white/10 hover:text-white"
              : appGhostTextButtonClassName,
          )}
        >
          <AuthEntryLink entry="/login">Log in</AuthEntryLink>
        </Button>
        <Button asChild className={appPrimaryButtonClassName}>
          <AuthEntryLink entry="/signup">Sign up</AuthEntryLink>
        </Button>
      </div>
    );
  }

  const meta = user.user_metadata || {};
  const avatarUrl = meta.avatar_url;
  const name =
    meta.full_name?.split(" ")[0] ||
    meta.name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <>
      <form ref={signOutFormRef} action={signOut} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className={cn(
              "group flex items-center gap-2 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
              forceWhite
                ? "text-white hover:bg-white/10 hover:text-white"
                : "hover:bg-accent",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-muted",
                forceWhite ? "border-white/20" : "border-border",
              )}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <span
              className={cn(
                "hidden max-w-25 truncate text-sm font-medium md:block",
                forceWhite ? "text-white/90" : "text-foreground",
              )}
            >
              {name}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform group-data-[state=open]:rotate-180",
                forceWhite ? "text-white/70" : "text-muted-foreground",
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield />
                Admin
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onSelect={handleLogout}
            className="text-red-500 focus:bg-destructive focus:text-destructive-foreground"
          >
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
