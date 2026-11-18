"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's search input (pill, muted fill, clear button). Shared by the hall
 * menu toolbar, Find food and the locations list so they look identical.
 */
export const SearchField = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
    value: string;
    onValueChange: (value: string) => void;
    containerClassName?: string;
  }
>(({ value, onValueChange, className, containerClassName, placeholder = "Search…", ...props }, ref) => (
  <div className={cn("relative flex-1", containerClassName)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    <input
      ref={ref}
      type="text"
      inputMode="search"
      enterKeyHint="search"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
      aria-label={props["aria-label"] ?? (typeof placeholder === "string" ? placeholder : "Search")}
      className={cn(
        "h-10 w-full rounded-full border border-transparent bg-muted pl-9 pr-9 text-base outline-none transition-colors focus:border-muted-foreground md:text-sm",
        className,
      )}
      {...props}
    />
    {value && (
      <button
        type="button"
        onClick={() => onValueChange("")}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
        aria-label="Clear search"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
));
SearchField.displayName = "SearchField";
