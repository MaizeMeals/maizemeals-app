"use client"

import { Star, X, Camera, Plus } from "lucide-react"
import { ItemWithPhotos } from "@/types/dining"
import { getDynamicTags } from "@/lib/filter-utils"
import { MScaleIndicator } from "./MScaleIndicator"
import { CarbonFootprint } from "./CarbonFootprint"
import { DietaryTag } from "./DietaryTags"
import { Button } from "@/components/ui/button"
import { appPrimaryButtonClassName } from "@/lib/button-styles"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetClose, SheetTitle } from "@/components/ui/sheet"
import Link from "next/link"
import Image from "next/image"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { getItemPhotoPublicUrl } from "@/lib/item-photos"
import { useLgUp } from "@/hooks/use-lg-up"
import { LogFoodDialog } from "@/components/nutrition/LogFoodDialog"
import { AllergenChips, IngredientsSection } from "@/components/ingredients/IngredientsSection"
import { AdditiveMarker } from "@/components/ingredients/AdditiveMarker"
import { parseIngredientFlags } from "@/lib/ingredients"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ItemReviewsTab } from "./ItemReviewsTab"
import { FoodIcon } from "@/components/ingredients/FoodIcon"
import { DISH_OPENED_EVENT } from "@/components/pwa/InstallPrompt"

const AXIS_LOCK_PX = 10

function closeThresholdPx() {
  if (typeof window === "undefined") return 120
  return Math.max(100, Math.round(window.innerHeight * 0.18))
}

/** How far the sheet can be pulled up past its open position (asymptote). */
const RUBBER_MAX_PX = 110

/** iOS-style rubber band: resistance grows the further you pull. */
function rubberBand(overshoot: number) {
  return RUBBER_MAX_PX * (1 - 1 / ((overshoot * 0.55) / RUBBER_MAX_PX + 1))
}

type SpringConfig = { stiffness: number; damping: number }
/** Slightly underdamped: settles with a small bounce. */
const SNAP_SPRING: SpringConfig = { stiffness: 520, damping: 32 }
/** Open: rises with a little settle at the top. */
const OPEN_SPRING: SpringConfig = { stiffness: 340, damping: 30 }
/** Close: critically damped, no bounce. */
const DISMISS_SPRING: SpringConfig = { stiffness: 260, damping: 32 }
/** A downward flick faster than this (px/s) closes the sheet even if it moved only a little. */
const FLICK_CLOSE_VELOCITY = 900

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Drag the item sheet with your finger: down to close, up for a rubber-band
 * overpull. On release it springs back (keeping the release velocity) or, past
 * the threshold or on a quick flick, flies off and closes.
 */
function useSwipeToCloseSheet(onDismiss: () => void, enabled: boolean) {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const dragYRef = useRef(0)
  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const baseYRef = useRef(0)
  const phaseRef = useRef<"idle" | "pending" | "handle" | "dragging">("idle")
  const windowCleanupRef = useRef<(() => void) | null>(null)
  const samplesRef = useRef<{ y: number; t: number }[]>([])
  const rafRef = useRef<number | null>(null)

  const apply = useCallback((y: number) => {
    dragYRef.current = y
    setDragY(y)
  }, [])

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const clearWindowListeners = useCallback(() => {
    windowCleanupRef.current?.()
    windowCleanupRef.current = null
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopAnimation()
      apply(0)
      setIsDragging(false)
      phaseRef.current = "idle"
      clearWindowListeners()
    }
  }, [enabled, apply, stopAnimation, clearWindowListeners])

  useEffect(
    () => () => {
      clearWindowListeners()
      stopAnimation()
    },
    [clearWindowListeners, stopAnimation],
  )

  const animateRef = useRef<typeof animateTo | null>(null)

  /** Spring dragY to `target`, starting at velocity `v0` (px/s). */
  const animateTo = useCallback(
    (target: number, v0: number, spring: SpringConfig, doneWhen?: (y: number) => boolean, onDone?: () => void) => {
      stopAnimation()
      if (prefersReducedMotion()) {
        apply(target)
        onDone?.()
        return
      }
      let y = dragYRef.current
      let v = v0
      let last = performance.now()
      const step = (now: number) => {
        const dt = Math.min(0.064, (now - last) / 1000)
        last = now
        // Fixed small substeps keep the integration stable on slow frames.
        const n = Math.max(1, Math.ceil(dt / 0.004))
        const h = dt / n
        for (let i = 0; i < n; i++) {
          const a = -spring.stiffness * (y - target) - spring.damping * v
          v += a * h
          y += v * h
        }
        const settled = Math.abs(v) < 6 && Math.abs(y - target) < 0.5
        if (settled || doneWhen?.(y)) {
          rafRef.current = null
          apply(settled ? target : y)
          onDone?.()
          return
        }
        apply(y)
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [apply, stopAnimation],
  )

  animateRef.current = animateTo

  // Rise in on a spring when the sheet opens (before first paint, so no flash).
  useLayoutEffect(() => {
    if (!enabled || prefersReducedMotion()) return
    apply(window.innerHeight)
    animateRef.current?.(0, 0, OPEN_SPRING)
  }, [enabled, apply])

  const closingRef = useRef(false)
  useEffect(() => {
    if (enabled) closingRef.current = false
  }, [enabled])

  /** Fly off-screen, then close (X button, tap outside, Escape). */
  const flyAway = useCallback(
    (velocity = 0) => {
      if (closingRef.current) return
      closingRef.current = true
      phaseRef.current = "idle"
      setIsDragging(false)
      const h = typeof window !== "undefined" ? window.innerHeight : 800
      animateTo(h, Math.max(velocity, 1400), DISMISS_SPRING, (pos) => pos >= h * 0.97, () => {
        onDismiss()
        apply(0)
      })
    },
    [animateTo, apply, onDismiss],
  )

  const trackSample = useCallback((y: number) => {
    const t = performance.now()
    const samples = samplesRef.current
    samples.push({ y, t })
    while (samples.length > 2 && t - samples[0].t > 80) samples.shift()
  }, [])

  const releaseVelocity = useCallback(() => {
    const samples = samplesRef.current
    if (samples.length < 2) return 0
    const a = samples[0]
    const b = samples[samples.length - 1]
    // A finger that stopped before lifting has no velocity.
    if (performance.now() - b.t > 60) return 0
    const dt = b.t - a.t
    return dt > 0 ? ((b.y - a.y) / dt) * 1000 : 0
  }, [])

  const moveTo = useCallback(
    (clientY: number) => {
      const raw = baseYRef.current + (clientY - startYRef.current)
      const y = raw >= 0 ? raw : -rubberBand(-raw)
      apply(y)
      trackSample(y)
    },
    [apply, trackSample],
  )

  const beginDrag = useCallback(
    (clientX: number, clientY: number) => {
      stopAnimation()
      // Catch the sheet mid-animation where it is.
      baseYRef.current = Math.max(0, dragYRef.current)
      startYRef.current = clientY
      startXRef.current = clientX
      samplesRef.current = []
    },
    [stopAnimation],
  )

  const release = useCallback(() => {
    phaseRef.current = "idle"
    setIsDragging(false)
    const y = dragYRef.current
    const v = releaseVelocity()
    if (y > 0 && (y >= closeThresholdPx() || (v > FLICK_CLOSE_VELOCITY && y > 16))) {
      flyAway(v)
      return
    }
    animateTo(0, v, SNAP_SPRING)
  }, [animateTo, flyAway, releaseVelocity])

  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return
      if (e.button !== 0 && e.pointerType === "mouse") return
      phaseRef.current = "handle"
      setIsDragging(true)
      beginDrag(e.clientX, e.clientY)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [enabled, beginDrag],
  )

  const handleCapturedPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return
      if (phaseRef.current !== "handle" && phaseRef.current !== "dragging") return
      phaseRef.current = "dragging"
      moveTo(e.clientY)
      e.preventDefault()
    },
    [enabled, moveTo],
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
      release()
    },
    [enabled, release],
  )

  /**
   * Content area: becomes a drag only when the body is scrolled to the top
   * and the finger moves down (moving up scrolls the content as usual).
   */
  const startPendingSwipe = useCallback(
    (e: React.PointerEvent<HTMLElement>, scrollTopAtDown = 0) => {
      if (!enabled) return
      if (e.button !== 0 && e.pointerType === "mouse") return
      if (scrollTopAtDown > 0) return

      const el = e.currentTarget
      const pointerId = e.pointerId
      phaseRef.current = "pending"
      const downX = e.clientX
      const downY = e.clientY

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return

        if (phaseRef.current === "pending") {
          const dy = ev.clientY - downY
          const dx = ev.clientX - downX
          if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return
          if (Math.abs(dx) >= Math.abs(dy) || dy <= 0) {
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
          // Start from where the finger crossed the axis-lock distance, so the sheet doesn't jump.
          beginDrag(ev.clientX, ev.clientY)
          ev.preventDefault()
          return
        }

        if (phaseRef.current === "dragging") {
          moveTo(ev.clientY)
          ev.preventDefault()
        }
      }

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return
        clearWindowListeners()
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
          release()
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
    [beginDrag, clearWindowListeners, enabled, moveTo, release],
  )

  return {
    dragY,
    isDragging,
    handleHandlePointerDown,
    handleCapturedPointerMove,
    handleCapturedPointerUp,
    startPendingSwipe,
    flyAway,
  }
}

/** Same patterned empty state as `LocationDetailPanel` hero when there is no photo. */
function ItemNoPhotoPattern({ name }: { name: string }) {
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
      <FoodIcon name={name} className="relative z-[1] h-20 w-20 drop-shadow-sm" />
      <p className="relative z-[1] text-center text-xs font-medium text-muted-foreground">
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
  /** Optional secondary action under "I ate this" (e.g. Find food's "View full menu at …"). */
  extraAction?: ReactNode
  /** The full record (ingredients) is still loading (Find food opens instantly). */
  ingredientsLoading?: boolean
}

export function ItemDetailPanel({
  item,
  onClose,
  onStartReview,
  reviewsReturnPath,
  variant,
  swipe,
  className,
  extraAction,
  ingredientsLoading = false,
}: ItemDetailPanelProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [tab, setTab] = useState("nutrition")
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const [pastImage, setPastImage] = useState(false)
  const isSheet = variant === "sheet"

  useEffect(() => {
    setActiveImageIndex(0)
    setTab("nutrition")
    setPastImage(false)
    scrollBodyRef.current?.scrollTo({ top: 0 })
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

      <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
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

        {isSheet ? (
          <SheetClose
            className={cn(
              "absolute right-4 top-10 z-30 rounded-full bg-black/50 p-2 text-white backdrop-blur-md transition-[opacity,transform] duration-200 hover:bg-black/70",
              pastImage && "pointer-events-none scale-90 opacity-0",
            )}
            tabIndex={pastImage ? -1 : undefined}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-30 rounded-full bg-black/50 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/70"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        )}
          {/* --- Scrollable Content Body --- */}
          <div
            ref={scrollBodyRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            onScroll={(e) => {
              const imageHeight = imageRef.current?.offsetHeight ?? 0
              setPastImage(e.currentTarget.scrollTop > imageHeight - 56)
            }}
            onPointerDown={
              isSheet && swipe
                ? (e) => {
                    const t = e.target as HTMLElement
                    if (
                      t.closest(
                        "button, a, input, textarea, select, [role='button'], [role='tab'], [data-sheet-swipe-ignore]",
                      )
                    ) {
                      return
                    }
                    swipe.startPendingSwipe(e, scrollBodyRef.current?.scrollTop ?? 0)
                  }
                : undefined
            }
          >
        <div
          ref={imageRef}
          className={cn(
            "relative w-full shrink-0 bg-muted",
            isSheet ? "h-52" : "h-44",
          )}
        >
          <div
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
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
                      <ItemNoPhotoPattern name={item.name} />
                    )}
                  </div>
                )
              })
            ) : (
              <div className="relative flex h-full w-full shrink-0 snap-center items-center justify-center bg-muted">
                <ItemNoPhotoPattern name={item.name} />
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
        </div>
          <div className="px-5 pb-6 pt-5">
          <div className="mb-5">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold leading-tight text-foreground">
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

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {hasReviews ? (
                <button
                  type="button"
                  onClick={() => setTab("reviews")}
                  className="flex items-center gap-1 rounded-md bg-maize/20 px-2 py-0.5 font-bold text-foreground"
                  aria-label={`Rated ${(item.avg_rating ?? 0).toFixed(1)}; show reviews`}
                >
                  <Star className="h-4 w-4 fill-maize text-maize" aria-hidden />
                  {(item.avg_rating ?? 0).toFixed(1)}
                  {(item.review_count ?? 0) > 0 ? (
                    <span className="font-normal text-muted-foreground">({item.review_count})</span>
                  ) : null}
                </button>
              ) : (
                <span className="text-muted-foreground">No reviews yet</span>
              )}
              {calories > 0 ? (
                <span className="tabular-nums text-muted-foreground">
                  {calories} cal · {protein}g protein · {carbs}g carbs · {fat}g fat
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {carbonTag && (
                <CarbonFootprint level={carbonTag.toLowerCase().replace('carbon', '') as any} />
              )}
              {otherTags.map(tag => (
                <DietaryTag key={tag} tag={tag} alwaysShowLabel />
              ))}
            </div>

            <AllergenChips allergens={item.allergens} notes={item.label_notes} className="mt-3" />
            <AdditiveMarker
              categories={parseIngredientFlags(item.ingredient_flags, item.ingredients)?.categories}
              max={4}
              className="mt-2 flex-wrap"
            />
            {extraAction ? <div className="mt-3">{extraAction}</div> : null}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid h-10 w-full grid-cols-3">
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews{(item.review_count ?? 0) > 0 ? ` (${item.review_count})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nutrition" className="mt-5">
              <div className="mx-auto max-w-sm rounded-sm border-2 border-foreground bg-card p-4 text-card-foreground shadow-sm">
                <h3 className="mb-1 border-b-[10px] border-foreground pb-1 text-3xl font-black leading-none">
                  Nutrition Facts
                </h3>

                <div className="mb-2 flex items-baseline justify-between border-b-4 border-foreground pb-2">
                  <span className="text-lg font-bold">Serving Size</span>
                  <span className="text-lg font-bold">{item.serving_size || "1 portion"}</span>
                </div>

                <div className="mb-2 flex items-baseline justify-between border-b-[4px] border-foreground pb-2">
                  <div>
                    <div className="text-sm font-bold">Amount per serving</div>
                    <div className="text-4xl font-black">Calories</div>
                  </div>
                  <div className="text-5xl font-black">{calories}</div>
                </div>

                <div className="space-y-0 text-sm">
                  <div className="mb-1 flex justify-end border-b border-foreground pb-1 text-xs font-bold">
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
            </TabsContent>

            <TabsContent value="ingredients" className="mt-5">
              <IngredientsSection item={item} loading={ingredientsLoading} hideHeading hideAllergens />
            </TabsContent>

            <TabsContent value="reviews" className="mt-5">
              <ItemReviewsTab
                itemId={item.id}
                reviewCount={item.review_count ?? 0}
                reviewsHref={reviewsHref}
              />
            </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Actions stay visible: no scrolling past the label to log or review. */}
        <div
          className={cn(
            "grid shrink-0 grid-cols-2 gap-3 border-t border-border bg-background px-5 pt-3",
            isSheet ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "pb-3",
          )}
        >
          <LogFoodDialog
            item={item}
            trigger={(
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2"
                disabled={calories <= 0 || item.item_type === "station_header"}
              >
                <Plus className="h-5 w-5" />
                Add to log
              </Button>
            )}
          />
          {onStartReview ? (
            <Button
              size="lg"
              className={cn("w-full gap-2", appPrimaryButtonClassName)}
              onClick={() => onStartReview(item)}
            >
              <Camera className="h-5 w-5" />
              I ate this
            </Button>
          ) : (
            <Button asChild size="lg" className={cn("w-full gap-2", appPrimaryButtonClassName)}>
              <Link href={`/review/new?item_id=${item.id}`}>
                <Camera className="h-5 w-5" />
                I ate this
              </Link>
            </Button>
          )}
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
  extraAction?: ReactNode
  ingredientsLoading?: boolean
}

export function DetailDrawer({
  item,
  isOpen,
  onClose,
  onStartReview,
  reviewsReturnPath,
  extraAction,
  ingredientsLoading,
}: FoodDetailDrawerProps) {
  const dismiss = useCallback(() => onClose(false), [onClose])
  const lgUp = useLgUp()
  // Radix Sheet portals to document.body — a CSS-hidden parent does not hide it; skip mounting on lg+.
  const swipe = useSwipeToCloseSheet(dismiss, isOpen && !!item && !lgUp)

  // Opening a dish counts as engagement for the "install the app" prompt.
  useEffect(() => {
    if (isOpen && item) window.dispatchEvent(new Event(DISH_OPENED_EVENT))
  }, [isOpen, item])

  if (!item) return null
  if (lgUp) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? onClose(true) : swipe.flyAway())}>
      <SheetContent
        side="bottom"
        hideClose
        className={cn(
          "flex h-[85vh] max-h-[85vh] flex-col overflow-hidden rounded-t-3xl bg-background p-0 will-change-transform",
          swipe.isDragging && "touch-none",
          "data-[state=closed]:animate-none data-[state=closed]:duration-0",
          // The spring in useSwipeToCloseSheet animates opening instead.
          "motion-safe:data-[state=open]:animate-none",
        )}
        style={{
          transform: `translate3d(0, ${swipe.dragY}px, 0)`,
          transition: "none",
          // Fills the gap below the sheet when it is overpulled upward.
          boxShadow: "0 160px 0 0 hsl(var(--background))",
        }}
      >
        <ItemDetailPanel
          item={item}
          variant="sheet"
          onClose={() => onClose(false)}
          onStartReview={onStartReview}
          reviewsReturnPath={reviewsReturnPath}
          swipe={swipe}
          extraAction={extraAction}
          ingredientsLoading={ingredientsLoading}
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
  extraAction,
  ingredientsLoading,
}: {
  item: ItemWithPhotos
  onClose: () => void
  onStartReview?: (item: ItemWithPhotos) => void
  reviewsReturnPath?: string
  extraAction?: ReactNode
  ingredientsLoading?: boolean
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
        extraAction={extraAction}
        ingredientsLoading={ingredientsLoading}
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
