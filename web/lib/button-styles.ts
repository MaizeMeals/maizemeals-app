import { cn } from "@/lib/utils"

/**
 * Shared `Button` className fragments for the app (landing + locations + nav).
 * Primary actions use maize; `text-umich-blue` is only paired with that fill.
 */
export const appPrimaryButtonClassName =
  "bg-maize text-umich-blue hover:bg-maize/80 font-bold"

/**
 * Outline control on cards, panels, and dialogs (muted hover + maize accent).
 */
export const appSurfaceOutlineButtonClassName =
  "border-input bg-background font-semibold shadow-sm hover:bg-muted/60 hover:border-muted-foreground/50 hover:text-maize"

/** Outline over hero video / dark imagery (glass). */
export const appHeroOutlineButtonClassName =
  "border-input bg-white/80 dark:bg-black/50 backdrop-blur-sm transform-gpu"

/**
 * Date / filter toolbar triggers (pill). Use `active` when the control has a non-default value.
 */
export function appToolbarControlClassName(active: boolean) {
  return cn(
    "relative h-10 w-10 shrink-0 rounded-full border gap-2 p-0 font-semibold shadow-sm md:w-auto md:px-4",
    "border-input bg-background",
    "hover:bg-muted/60 hover:border-muted-foreground/50 hover:text-maize",
    active &&
      "bg-maize/30 border-maize text-foreground hover:text-foreground",
  )
}

/** Mobile-only icon trigger (e.g. date in drawer). */
export function appToolbarIconControlClassName(active: boolean) {
  return cn(
    "h-10 w-10 shrink-0 rounded-full border font-semibold shadow-sm",
    "border-input bg-background",
    "hover:bg-muted/60 hover:border-muted-foreground/50 hover:text-maize",
    active &&
      "bg-maize/30 border-maize text-foreground hover:text-foreground",
  )
}

/** Dialog footer secondary (reset, dismiss-style actions). */
export const appDialogMutedOutlineButtonClassName =
  "border-input bg-background font-medium text-muted-foreground shadow-sm hover:bg-muted/60 hover:border-muted-foreground/50 hover:text-foreground"

/** Low-emphasis dashed outline (e.g. “Be the first to review”). */
export const appDashedSecondaryButtonClassName = cn(
  appSurfaceOutlineButtonClassName,
  "border-dashed",
)

/** Ghost icon control (e.g. map drawer back). */
export const appGhostIconButtonClassName =
  "h-9 w-9 shrink-0 rounded-full hover:bg-muted/60"

/** Ghost text control on opaque surfaces (e.g. header “Log in”). */
export const appGhostTextButtonClassName =
  "hover:bg-muted/60 hover:text-maize"

/** Landing aliases (same tokens). */
export const landingPrimaryButtonClassName = appPrimaryButtonClassName
export const landingHeroOutlineButtonClassName = appHeroOutlineButtonClassName
export const landingSurfaceOutlineButtonClassName = appSurfaceOutlineButtonClassName
