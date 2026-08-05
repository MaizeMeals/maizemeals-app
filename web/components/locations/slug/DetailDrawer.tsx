"use client"

import { Star, X, Camera } from "lucide-react"
import { ItemWithPhotos } from "@/types/dining"
import { getDynamicTags } from "@/lib/filter-utils"
import { MScaleIndicator } from "./MScaleIndicator"
import { CarbonFootprint } from "./CarbonFootprint"
import { DietaryTag } from "./DietaryTags"
import { Button } from "@/components/ui/button"
import {
  appDashedSecondaryButtonClassName,
  appPrimaryButtonClassName,
} from "@/lib/button-styles"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetClose, SheetTitle } from "@/components/ui/sheet"
import Link from "next/link"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { getItemPhotoPublicUrl } from "@/lib/item-photos"
import { useLgUp } from "@/hooks/use-lg-up"
import { LogFoodDialog } from "@/components/nutrition/LogFoodDialog"

const AXIS_LOCK_PX = 10

function closeThresholdPx() {
  if (typeof window === "undefined") return 120
  return Math.max(100, Math.round(window.innerHeight * 0.18))
}

function useSwipeToCloseSheet(onDismiss: () => void, enabled: boolean) {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isExitAnimating, setIsExitAnimating] = useState(false)

  const dragYRef = useRef(0)
  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const phaseRef = useRef<"idle" | "pending" | "handle" | "dragging">("idle")
  const windowCleanupRef = useRef<(() => void) | null>(null)
  const dismissAfterTransitionRef = useRef(false)
  const dismissFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const completeDismiss = useCallback(() => {
    if (dismissFallbackTimerRef.current) {
      clearTimeout(dismissFallbackTimerRef.current)
      dismissFallbackTimerRef.current = null
    }
    dismissAfterTransitionRef.current = false
    setIsExitAnimating(false)
    setDragY(0)
    dragYRef.current = 0
    onDismiss()
  }, [onDismiss])

  const clearWindowListeners = useCallback(() => {
    windowCleanupRef.current?.()
    windowCleanupRef.current = null
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (dismissFallbackTimerRef.current) {
        clearTimeout(dismissFallbackTimerRef.current)
        dismissFallbackTimerRef.current = null
      }
      setDragY(0)
      dragYRef.current = 0
      setIsDragging(false)
      setIsExitAnimating(false)
      dismissAfterTransitionRef.current = false
      phaseRef.current = "idle"
      clearWindowListeners()
    }
  }, [enabled, clearWindowListeners])

  useEffect(
    () => () => {
      clearWindowListeners()
      if (dismissFallbackTimerRef.current) {
        clearTimeout(dismissFallbackTimerRef.current)
        dismissFallbackTimerRef.current = null
      }
    },
    [clearWindowListeners],
  )

  const setOffset = useCallback((y: number) => {
    const next = Math.max(0, y)
    dragYRef.current = next
    setDragY(next)
  }, [])

  const flushDismissAnimation = useCallback(() => {
    dismissAfterTransitionRef.current = true
    setIsDragging(false)
    setIsExitAnimating(true)
    const h = typeof window !== "undefined" ? window.innerHeight : 720
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dragYRef.current = h
        setDragY(h)
      })
    })
    if (dismissFallbackTimerRef.current) clearTimeout(dismissFallbackTimerRef.current)
    dismissFallbackTimerRef.current = setTimeout(() => {
      dismissFallbackTimerRef.current = null
      if (!dismissAfterTransitionRef.current) return
      completeDismiss()
    }, 450)
  }, [completeDismiss])

  const onSheetTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "transform" || e.target !== e.currentTarget) return
      if (!dismissAfterTransitionRef.current) return
      completeDismiss()
    },
    [completeDismiss],
  )

  const endDrag = useCallback(() => {
    const y = dragYRef.current
    phaseRef.current = "idle"
    setIsDragging(false)
    if (y >= closeThresholdPx()) {
      flushDismissAnimation()
      return
    }
    setDragY(0)
    dragYRef.current = 0
  }, [flushDismissAnimation])

  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return
      if (e.button !== 0 && e.pointerType === "mouse") return
      phaseRef.current = "handle"
      setIsDragging(true)
      startYRef.current = e.clientY
      startXRef.current = e.clientX
      setOffset(0)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [enabled, setOffset],
  )

  const handleCapturedPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return
      if (phaseRef.current !== "handle" && phaseRef.current !== "dragging") return
      if (phaseRef.current === "handle") {
        phaseRef.current = "dragging"
      }
      const dy = e.clientY - startYRef.current
      if (dy > 0) {
        setOffset(dy)
        e.preventDefault()
      } else {
        setOffset(0)
      }
    },
    [enabled, setOffset],
  )

  const handleCapturedPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return
      if (phaseRef.current !== "handle" && phaseRef.current !== "dragging") return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      endDrag()
    },
    [enabled, endDrag],
  )

  const startPendingSwipe = useCallback(
    (e: React.PointerEvent<HTMLElement>, scrollTopAtDown = 0) => {
      if (!enabled) return
      if (e.button !== 0 && e.pointerType === "mouse") return
      if (scrollTopAtDown > 0) return

      const el = e.currentTarget
      const pointerId = e.pointerId
      phaseRef.current = "pending"
      startYRef.current = e.clientY
      startXRef.current = e.clientX
      setOffset(0)

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return

        if (phaseRef.current === "pending") {
          const dy = ev.clientY - startYRef.current
          const dx = ev.clientX - startXRef.current
          if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return

          if (Math.abs(dx) >= Math.abs(dy)) {
            phaseRef.current = "idle"
            clearWindowListeners()
            return
          }

          if (dy <= 0) {
            phaseRef.current = "idle"
            clearWindowListeners()
            return
          }

          try {
            el.setPointerCapture(pointerId)
          } catch {
            phaseRef.current = "idle"
            clearWindowListeners()
            return
          }

          phaseRef.current = "dragging"
          setIsDragging(true)
          setOffset(dy)
          ev.preventDefault()
          return
        }

        if (phaseRef.current === "dragging") {
          const dy = ev.clientY - startYRef.current
          if (dy > 0) {
            setOffset(dy)
            ev.preventDefault()
          } else {
            setOffset(0)
          }
        }
      }

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        window.removeEventListener("pointercancel", onUp)
        windowCleanupRef.current = null

        if (phaseRef.current === "pending") {
          phaseRef.current = "idle"
          return
        }

        if (phaseRef.current === "dragging") {
          try {
            el.releasePointerCapture(pointerId)
          } catch {
            /* ignore */
          }
          const y = dragYRef.current
          phaseRef.current = "idle"
          setIsDragging(false)
          if (y >= closeThresholdPx()) {
            flushDismissAnimation()
          } else {
            setDragY(0)
            dragYRef.current = 0
          }
        }
      }

      window.addEventListener("pointermove", onMove, { passive: false })
      window.addEventListener("pointerup", onUp)
      window.addEventListener("pointercancel", onUp)
      windowCleanupRef.current = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        window.removeEventListener("pointercancel", onUp)
      }
    },
    [clearWindowListeners, enabled, flushDismissAnimation, setOffset],
  )

  const sheetTransition =
    isDragging || isExitAnimating
      ? isDragging
        ? "none"
        : "transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)"
      : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"

  return {
    dragY,
    isDragging,
    sheetTransition,
    onSheetTransitionEnd,
    handleHandlePointerDown,
    handleCapturedPointerMove,
    handleCapturedPointerUp,
    startPendingSwipe,
  }
}

/** Same patterned empty state as `LocationDetailPanel` hero when there is no photo. */
function ItemNoPhotoPattern() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
      <div
        className="absolute inset-0 bg-muted [background-image:radial-gradient(hsl(var(--foreground)/0.08)_1px,transparent_0)] [background-size:18px_18px]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.35] [background-image:repeating-linear-gradient(135deg,hsl(var(--border))_0,hsl(var(--border))_1px,transparent_1px,transparent_11px)]"
        aria-hidden
      />
      <p className="relative z-[1] text-center text-sm font-medium text-muted-foreground">
        Add a photo with a review
      </p>
    </div>
  )
}

export type ItemDetailSwipeApi = ReturnType<typeof useSwipeToCloseSheet>

export interface ItemDetailPanelProps {
  item: ItemWithPhotos
  onClose: () => void
  onStartReview?: (item: ItemWithPhotos) => void
  /** When set, "See reviews" includes this path so the reviews page can link back to the menu. */
  reviewsReturnPath?: string
  variant: "sheet" | "sidebar"
  swipe?: ItemDetailSwipeApi
  className?: string
}

export function ItemDetailPanel({
  item,
  onClose,
  onStartReview,
  reviewsReturnPath,
  variant,
  swipe,
  className,
}: ItemDetailPanelProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const isSheet = variant === "sheet"

  useEffect(() => {
    setActiveImageIndex(0)
  }, [item.id])

  const carbonTag = item.dietary_tags?.find(t => t.toLowerCase().startsWith('carbon'))
  const dynamicTags = getDynamicTags(item)
  const otherTags = Array.from(new Set([
    ...(item.dietary_tags?.filter(t => !t.toLowerCase().startsWith('carbon')) || []),
    ...dynamicTags
  ]))

  // UPDATED: Macro Parsing based on your provided JSON structure
  const macros = typeof item.macronutrients === 'object' && item.macronutrients
    ? (item.macronutrients as Record<string, number>)
    : {}

  const calories = macros["Calories"] || 0
  const protein = macros["Protein"] || 0
  const carbs = macros["Total Carbohydrate"] || 0
  const fat = macros["Total Fat"] || 0
  const sugar = macros["Sugars"] || 0
  const fiber = macros["Dietary Fiber"] || 0
  const sodium = macros["Sodium"] || 0
  const satFat = macros["Saturated Fat"] || 0

  const hasPhotos = (item.photos?.length ?? 0) > 0
  const imagePaths = hasPhotos
    ? item.photos!.map((p) => p.storage_path)
    : []

  const hasReviews =
    (item.avg_rating ?? 0) > 0 || (item.review_count ?? 0) > 0

  const reviewsHref =
    reviewsReturnPath && reviewsReturnPath.length > 0
      ? `/reviews?item_id=${encodeURIComponent(item.id)}&return=${encodeURIComponent(reviewsReturnPath)}`
      : `/reviews?item_id=${encodeURIComponent(item.id)}`

  const imageSizes = isSheet ? "100vw" : "(max-width: 1023px) 0px, min(420px, 38vw)"

  return (
    <>
      {isSheet && <SheetTitle className="sr-only">{item.name} Details</SheetTitle>}

      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        {isSheet && swipe && (
          <div
            className="z-30 flex shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-2 bg-background pb-2 pt-3 active:cursor-grabbing"
            onPointerDown={swipe.handleHandlePointerDown}
            onPointerMove={swipe.handleCapturedPointerMove}
            onPointerUp={swipe.handleCapturedPointerUp}
            onPointerCancel={swipe.handleCapturedPointerUp}
          >
            <span className="sr-only">Drag down to close</span>
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          </div>
        )}

        <div
          className={cn(
            "relative min-h-0 w-full shrink-0 bg-muted",
            isSheet ? "h-64" : "h-52",
          )}
        >
          <div
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
            onPointerDown={
              isSheet && swipe ? (e) => swipe.startPendingSwipe(e) : undefined
            }
            onScroll={(e) => {
                const scrollLeft = e.currentTarget.scrollLeft
                const width = e.currentTarget.offsetWidth
                setActiveImageIndex(Math.round(scrollLeft / width))
              }}
            >
            {hasPhotos ? (
              imagePaths.map((path, idx) => {
                const isLocal = path.startsWith("/")
                const src = isLocal ? path : getItemPhotoPublicUrl(path)
                const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
                const remoteUnoptimized =
                  !isLocal &&
                  supabaseBase.length > 0 &&
                  src.startsWith(supabaseBase)
                return (
                  <div
                    key={`${path}-${idx}`}
                    className="relative flex h-full w-full shrink-0 snap-center items-center justify-center bg-muted"
                  >
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes={imageSizes}
                        unoptimized={remoteUnoptimized}
                      />
                    ) : (
                      <ItemNoPhotoPattern />
                    )}
                  </div>
                )
              })
            ) : (
              <div className="relative flex h-full w-full shrink-0 snap-center items-center justify-center bg-muted">
                <ItemNoPhotoPattern />
              </div>
            )}
          </div>

          {hasPhotos ? (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {imagePaths.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeImageIndex ? "bg-white w-4" : "bg-white/50"}`}
                />
              ))}
            </div>
          ) : null}

          {isSheet ? (
            <SheetClose className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors">
              <X className="h-5 w-5" />
            </SheetClose>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/70"
              aria-label="Close details"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

          {/* --- Scrollable Content Body --- */}
          <div
            ref={scrollBodyRef}
            className="min-h-0 flex-1 overflow-y-auto p-6"
            onPointerDown={
              isSheet && swipe
                ? (e) => {
                    const t = e.target as HTMLElement
                    if (
                      t.closest(
                        "button, a, input, textarea, select, [role='button'], [data-sheet-swipe-ignore]",
                      )
                    ) {
                      return
                    }
                    swipe.startPendingSwipe(e, scrollBodyRef.current?.scrollTop ?? 0)
                  }
                : undefined
            }
          >

          <div className="mb-6">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h2 className="text-2xl font-bold text-foreground leading-tight">
                {item.name}
              </h2>
              <div
                className="relative z-20 shrink-0"
                data-sheet-swipe-ignore
                onClick={(e) => e.stopPropagation()}
              >
                <MScaleIndicator score={item.nutrition_score} size="lg" showLabel />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {hasReviews ? (
                <>
                  <div className="flex items-center gap-1 bg-maize/20 px-2 py-1 rounded-md">
                    <Star className="w-4 h-4 fill-maize text-maize" />
                    <span className="font-bold text-foreground">
                      {(item.avg_rating ?? 0).toFixed(1)}
                    </span>
                  </div>
                  {(item.review_count ?? 0) > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      ({item.review_count} review{(item.review_count ?? 0) === 1 ? "" : "s"})
                    </span>
                  ) : null}
                  <Link href={reviewsHref} className="text-sm text-blue-600 hover:underline">
                    See reviews
                  </Link>
                </>
              ) : (
                onStartReview ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      appDashedSecondaryButtonClassName,
                      "h-8 gap-2 text-xs",
                    )}
                    onClick={() => onStartReview(item)}
                  >
                    <Star className="w-3.5 h-3.5 text-muted-foreground" />
                    Be the first to review
                  </Button>
                ) : (
                  <Link href={`/review/new?item_id=${item.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        appDashedSecondaryButtonClassName,
                        "h-8 gap-2 text-xs",
                      )}
                    >
                      <Star className="w-3.5 h-3.5 text-muted-foreground" />
                      Be the first to review
                    </Button>
                  </Link>
                )
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {carbonTag && (
                <CarbonFootprint level={carbonTag.toLowerCase().replace('carbon', '') as any} />
              )}
              {otherTags.map(tag => (
                <DietaryTag key={tag} tag={tag} alwaysShowLabel />
              ))}
            </div>
          </div>

          <hr className="border-border mb-6" />

          {/* --- Nutrition Facts Label --- */}
          <div className="border-2 border-foreground p-4 rounded-sm max-w-sm mx-auto bg-card text-card-foreground shadow-sm">
            <h3 className="text-3xl font-black border-b-[10px] border-foreground pb-1 mb-1 leading-none">
              Nutrition Facts
            </h3>

            <div className="flex justify-between items-baseline border-b-4 border-foreground pb-2 mb-2">
              <span className="font-bold text-lg">Serving Size</span>
              <span className="font-bold text-lg">{item.serving_size || "1 portion"}</span>
            </div>

            <div className="flex justify-between items-baseline border-b-[4px] border-foreground pb-2 mb-2">
              <div>
                <div className="font-bold text-sm">Amount per serving</div>
                <div className="font-black text-4xl">Calories</div>
              </div>
              <div className="text-5xl font-black">{calories}</div>
            </div>

            <div className="space-y-0 text-sm">
              <div className="flex justify-end text-xs font-bold border-b border-foreground pb-1 mb-1">
                 % Daily Value*
              </div>

              <MacroRow label="Total Fat" amount={fat} unit="g" bold />
              <MacroRow label="Saturated Fat" amount={satFat} unit="g" indent />
              <MacroRow label="Sodium" amount={sodium} unit="mg" bold />
              <MacroRow label="Total Carbohydrate" amount={carbs} unit="g" bold />
              <MacroRow label="Dietary Fiber" amount={fiber} unit="g" indent />
              <MacroRow label="Total Sugars" amount={sugar} unit="g" indent />
              <MacroRow label="Protein" amount={protein} unit="g" bold largeBorder />
            </div>

             <div className="mt-2 text-[10px] leading-tight text-muted-foreground">
               * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
             </div>
          </div>

          <div className="mt-8 mb-3 text-center">
             <LogFoodDialog item={item} />
          </div>

          <div className="mb-20 text-center">
             {onStartReview ? (
               <Button
                 size="lg"
                 className={cn(
                   "w-full gap-2 shadow-lg",
                   appPrimaryButtonClassName,
                 )}
                 onClick={() => onStartReview(item)}
               >
                 <Camera className="w-5 h-5" />
                 I ate this (Review)
               </Button>
             ) : (
               <Link href={`/review/new?item_id=${item.id}`} className="inline-block w-full">
                 <Button
                   size="lg"
                   className={cn(
                     "w-full gap-2 shadow-lg",
                     appPrimaryButtonClassName,
                   )}
                 >
                   <Camera className="w-5 h-5" />
                   I ate this (Review)
                 </Button>
               </Link>
             )}
          </div>
        </div>
      </div>
    </>
  )
}

export interface FoodDetailDrawerProps {
  item: ItemWithPhotos | null
  isOpen: boolean
  onClose: (open: boolean) => void
  /** When provided, "I ate this" / "Be the first to review" open the review modal for this item instead of navigating. */
  onStartReview?: (item: ItemWithPhotos) => void
  /** Path to the current location menu; passed through to reviews for a "return to menu" link. */
  reviewsReturnPath?: string
}

export function DetailDrawer({
  item,
  isOpen,
  onClose,
  onStartReview,
  reviewsReturnPath,
}: FoodDetailDrawerProps) {
  const dismiss = useCallback(() => onClose(false), [onClose])
  const lgUp = useLgUp()
  // Radix Sheet portals to document.body — a CSS-hidden parent does not hide it; skip mounting on lg+.
  const swipe = useSwipeToCloseSheet(dismiss, isOpen && !!item && !lgUp)

  if (!item) return null
  if (lgUp) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        hideClose
        onTransitionEnd={swipe.onSheetTransitionEnd}
        className={cn(
          "flex h-[85vh] max-h-[85vh] flex-col overflow-hidden rounded-t-3xl bg-background p-0 will-change-transform",
          swipe.isDragging && "touch-none",
          "data-[state=closed]:animate-none data-[state=closed]:duration-0",
        )}
        style={{
          transform: `translateY(${swipe.dragY}px)`,
          transition: swipe.sheetTransition,
        }}
      >
        <ItemDetailPanel
          item={item}
          variant="sheet"
          onClose={() => onClose(false)}
          onStartReview={onStartReview}
          reviewsReturnPath={reviewsReturnPath}
          swipe={swipe}
        />
      </SheetContent>
    </Sheet>
  )
}

const DESKTOP_DETAIL_PANEL_MS = 300

/** Desktop (lg+): inline panel on the right of the menu — no overlay, no swipe. */
export function ItemDetailSidebar({
  item,
  onClose,
  onStartReview,
  reviewsReturnPath,
}: {
  item: ItemWithPhotos
  onClose: () => void
  onStartReview?: (item: ItemWithPhotos) => void
  reviewsReturnPath?: string
}) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    setExiting(false)
  }, [item.id])

  const handleDismiss = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose()
      return
    }
    setExiting(true)
  }, [onClose])

  const onExitAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      onClose()
    },
    [onClose],
  )

  return (
    <div
      key={item.id}
      className={cn(
        "flex h-full min-h-0 flex-col",
        exiting
          ? "motion-reduce:animate-none lg:animate-out lg:slide-out-to-right lg:fade-out lg:fill-mode-forwards lg:duration-300 lg:ease-out"
          : "motion-reduce:animate-none lg:animate-in lg:slide-in-from-right lg:fade-in lg:duration-300 lg:ease-out",
      )}
      style={{ animationDuration: `${DESKTOP_DETAIL_PANEL_MS}ms` }}
      onAnimationEnd={exiting ? onExitAnimationEnd : undefined}
    >
      <ItemDetailPanel
        item={item}
        variant="sidebar"
        onClose={handleDismiss}
        onStartReview={onStartReview}
        reviewsReturnPath={reviewsReturnPath}
        className="h-full min-h-0"
      />
    </div>
  )
}

function MacroRow({ label, amount, unit, bold, indent, largeBorder }: { label: string, amount: any, unit: string, bold?: boolean, indent?: boolean, largeBorder?: boolean }) {
    return (
        <div className={`flex justify-between items-center py-1 ${largeBorder ? "border-b-[8px] border-foreground" : "border-b border-border"}`}>
            <span className={`${bold ? "font-bold" : ""} ${indent ? "pl-4" : ""}`}>
                {label} <span className="font-normal">{amount}{unit}</span>
            </span>
            {/* Note: We aren't calculating actual DV% here since we don't have the FDA table, so we leave the right side generic or empty for now unless you want to hardcode the math. */}
            <span className="font-bold"></span>
        </div>
    )
}
