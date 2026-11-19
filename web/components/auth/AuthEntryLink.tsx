"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ComponentProps, MouseEvent, PointerEvent } from "react";
import { authEntryHref } from "@/lib/auth-next-path";

type Entry = "/login" | "/signup";

function currentLocationPath(): string {
  return window.location.pathname + window.location.search + window.location.hash;
}

type AuthEntryLinkProps = {
  entry: Entry;
} & Omit<ComponentProps<typeof Link>, "href">;

/** Login or signup link that comes back to the page the person was on. */
export function AuthEntryLink({
  entry,
  onClick,
  onPointerDown,
  ...props
}: AuthEntryLinkProps) {
  const router = useRouter();

  const rememberReturn = (anchor: HTMLAnchorElement) => {
    anchor.setAttribute("href", authEntryHref(entry, currentLocationPath()));
  };

  return (
    <Link
      {...props}
      href={entry}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerDown?.(event);
        rememberReturn(event.currentTarget);
      }}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        router.push(authEntryHref(entry, currentLocationPath()));
      }}
    />
  );
}
