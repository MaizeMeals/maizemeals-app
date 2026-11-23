import * as React from "react";
import { cn } from "@/lib/utils";
import { HEADER_HEIGHT } from "@/components/layout/constants";

const WIDTHS = {
  /** Reading / forms: settings, legal, FAQ. */
  narrow: "max-w-2xl",
  /** Default content pages: Find food, reviews, macros. */
  default: "max-w-3xl",
  /** Dashboards, admin tables. */
  wide: "max-w-6xl",
} as const;

/**
 * Standard page frame below the fixed header: consistent top offset, side
 * gutters (16px mobile), max width and bottom spacing above the mobile tab
 * bar (body already pads for --bottom-nav-h).
 *
 * Full-bleed experiences (map, hall hero) don't use this.
 */
export function PageShell({
  width = "default",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: keyof typeof WIDTHS }) {
  return (
    <div
      className={cn("mx-auto w-full px-4 pb-10 md:px-6", WIDTHS[width], className)}
      style={{ paddingTop: `calc(${HEADER_HEIGHT} + 1.25rem)` }}
      {...props}
    >
      {children}
    </div>
  );
}

/** Page title block. One per page; `actions` sit top-right (e.g. a settings button). */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="type-page-title">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Section heading inside a page. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="type-section-title">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
