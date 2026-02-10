"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { User as UserIcon, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";

interface UserNavProps {
  user: User | null;
  signOut: () => Promise<void>;
  forceWhite?: boolean;
}

export function UserNav({ user, signOut, forceWhite = false }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { track, reset } = useAnalytics();

  const handleLogout = () => {
    track("logout_clicked");
    reset();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
              : "hover:bg-muted hover:text-foreground",
          )}
        >
          <Link href="/login">Log in</Link>
        </Button>
        <Button
          asChild
          className="bg-maize text-umich-blue hover:bg-yellow-400"
        >
          <Link href="/signup">Sign up</Link>
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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
          forceWhite
            ? "hover:bg-white/10 text-white hover:text-white"
            : "hover:bg-accent",
        )}
      >
        <div
          className={cn(
            "h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center border",
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
            "text-sm font-medium hidden md:block max-w-25 truncate",
            forceWhite ? "text-white/90" : "text-foreground",
          )}
        >
          {name}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            forceWhite ? "text-white/70" : "text-muted-foreground",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover text-popover-foreground p-1 shadow-md z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-2 py-1.5 text-sm font-semibold border-b border-border mb-1">
            My Account
          </div>
          <Link
            href="/settings"
            className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
          <form action={signOut} className="w-full">
            <button
              type="submit"
              onClick={handleLogout}
              className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-destructive hover:text-destructive-foreground text-red-500 transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
