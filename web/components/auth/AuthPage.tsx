'use client'

import {
  Suspense,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BarChart3, Star, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AUTH_UNIFIED_GLASS_BASE,
  HEADER_HEIGHT_PX,
} from '@/components/layout/constants'
import { useAnalytics } from '@/hooks/use-analytics'

export type AuthPageSource = 'login' | 'signup'

/**
 * Dining / retail photos under public/images/dining_halls/.
 * Logos omitted — they read poorly in a scrolling collage.
 */
const AUTH_DINING_IMAGES: readonly string[] = [
  '/images/dining_halls/berts-cafe.jpeg',
  '/images/dining_halls/bursley-dining-hall.jpg',
  '/images/dining_halls/cafe-32.jpg',
  '/images/dining_halls/darwins.jpeg',
  '/images/dining_halls/default.jpg',
  '/images/dining_halls/east-quad-dining-hall.jpg',
  '/images/dining_halls/fireside-cafe.jpg',
  '/images/dining_halls/java-blu-at-taubman.jpg',
  '/images/dining_halls/lawyers-club-dining-hall.jpg',
  '/images/dining_halls/maizies.jpeg',
  '/images/dining_halls/markley-dining-hall.jpg',
  '/images/dining_halls/martha-cook-dining-hall.jpg',
  '/images/dining_halls/mosher-jordan-dining-hall.jpg',
  '/images/dining_halls/mujo-cafe.jpg',
  '/images/dining_halls/north-quad-dining-hall.jpg',
  '/images/dining_halls/south-quad-dining-hall.jpg',
  '/images/dining_halls/twigs-at-oxford.jpg',
  '/images/dining_halls/umma-cafe.jpeg',
]

function duplicatedForMarquee(srcs: readonly string[]) {
  return [...srcs, ...srcs]
}

const MARQUEE_DURATION_SEC = 200

/** Auth copy: theme on mobile, light-on-dark at `md+` over collage. */
const authBody = 'text-foreground/90 md:text-white/90'
const authBodyMuted = 'text-muted-foreground md:text-white/75'
const authHeading = 'text-foreground md:text-white'

/** Tailwind `md` breakpoint — keep in sync with clip-path gating. */
const MD_MIN_PX = 768

/**
 * `polygon()` must not contain `calc()` / `env(..., …)` — commas break vertex parsing.
 * Below the header, the blur matches the left half of the viewport (`md:w-1/2` sidebar).
 */
function getAuthGlassClipPath(): string {
  const header = document.querySelector('header')
  const headerBottomPx = header
    ? Math.ceil(header.getBoundingClientRect().bottom)
    : HEADER_HEIGHT_PX

  return `polygon(0px 0px, 100% 0px, 100% ${headerBottomPx}px, 50% ${headerBottomPx}px, 50% 100%, 0px 100%)`
}

/** Full-viewport glass; `md+` clip-path = full-width under header, left 50% below (matches sidebar). */
function AuthGlassLayer() {
  const [clipStyles, setClipStyles] = useState<CSSProperties | undefined>(
    undefined,
  )

  useLayoutEffect(() => {
    const update = () => {
      if (window.innerWidth < MD_MIN_PX) {
        setClipStyles(undefined)
        return
      }
      const clipPath = getAuthGlassClipPath()
      setClipStyles({
        clipPath,
        WebkitClipPath: clipPath,
      })
    }

    update()

    const header = document.querySelector('header')
    const roHeader = header ? new ResizeObserver(update) : null
    if (header && roHeader) roHeader.observe(header)

    window.addEventListener('resize', update)
    return () => {
      roHeader?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div
      className={cn(AUTH_UNIFIED_GLASS_BASE, 'hidden md:block')}
      style={clipStyles}
      aria-hidden
    />
  )
}

function splitImagesByRow(rowIndex: number, rowCount: number): string[] {
  return AUTH_DINING_IMAGES.filter((_, i) => i % rowCount === rowIndex)
}

function CollageMarqueeRow({
  images,
  reverse,
  className,
}: {
  images: readonly string[]
  reverse: boolean
  className?: string
}) {
  const loopSlots = duplicatedForMarquee(images)
  return (
    <div className={cn('relative min-h-0 flex-1 overflow-hidden', className)}>
      <div className="absolute inset-0 flex items-stretch">
        <div
          className={cn(
            'flex h-full w-max items-stretch gap-3 px-1 md:gap-4 md:px-2',
            reverse
              ? 'animate-auth-dining-marquee-reverse'
              : 'animate-auth-dining-marquee',
          )}
          style={{ animationDuration: `${MARQUEE_DURATION_SEC}s` }}
        >
          {loopSlots.map((src, i) => (
            <div key={`${src}-${i}`} className="relative h-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- local dining assets; width from intrinsic ratio */}
              <img
                src={src}
                alt=""
                className="block h-full w-auto max-w-none"
                loading={i < 3 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Full-viewport-width collage (md+). */
function AuthDiningCollageViewport() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-0 overflow-hidden bg-black"
      aria-hidden
    >
      {/* Single row when viewport is shorter than 720px */}
      <div className="flex h-full flex-col [@media(min-height:720px)]:hidden">
        <CollageMarqueeRow images={AUTH_DINING_IMAGES} reverse={false} />
      </div>

      <div className="hidden h-full flex-col gap-2 [@media(min-height:560px)]:flex [@media(min-height:560px)]:hidden md:gap-3">
        <CollageMarqueeRow images={splitImagesByRow(0, 2)} reverse={false} />
        <CollageMarqueeRow images={splitImagesByRow(1, 2)} reverse />
      </div>

      <div className="hidden h-full flex-col gap-2 [@media(min-height:720px)]:flex md:gap-3">
        <CollageMarqueeRow images={splitImagesByRow(0, 4)} reverse={false} />
        <CollageMarqueeRow images={splitImagesByRow(1, 4)} reverse />
        <CollageMarqueeRow images={splitImagesByRow(2, 4)} reverse={false} />
      </div>
    </div>
  )
}

const benefits = [
  {
    icon: Star,
    title: 'Rate & Review',
    description:
      'Warn others about dry chicken or hype up the Mojo cookies.',
  },
  {
    icon: BarChart3,
    title: 'Track Macros',
    description:
      'Log your meals and hit your protein goals automatically.',
  },
  {
    icon: Target,
    title: 'Smart Matches',
    description:
      'Get personalized menu recommendations based on your tastes.',
  },
] as const

function AuthPageFallback() {
  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background md:bg-black"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <AuthGlassLayer />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col md:flex-row md:items-stretch">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center md:w-1/2 md:shrink-0 md:items-center md:px-8 lg:px-12">
          <div className="flex min-h-0 w-full max-w-xl flex-1 flex-col max-md:justify-center max-md:pt-[calc(4rem+env(safe-area-inset-top,0px)+1.25rem)] md:mx-auto md:w-full md:pt-0">
            <div
              className="mx-auto flex min-h-0 w-full max-w-md max-md:flex-none flex-col items-center justify-start space-y-6 bg-transparent px-6 pb-10 pt-0 sm:px-8 md:max-w-none md:flex-1 md:items-stretch md:justify-center md:px-8 md:py-12 md:pt-[calc(4rem+env(safe-area-inset-top,0px))]"
            >
              <div className="mx-auto w-full max-w-lg space-y-3 text-center">
                <div className="mx-auto h-8 w-4/5 animate-pulse rounded-md bg-muted md:bg-white/10" />
                <div className="mx-auto h-14 animate-pulse rounded-md bg-muted md:bg-white/10" />
              </div>
              <div className="h-20 w-full animate-pulse rounded-md bg-muted md:bg-white/10" />
              <div className="h-40 w-full animate-pulse rounded-xl bg-muted md:bg-white/10" />
              <div className="h-12 w-full animate-pulse rounded-md bg-muted md:bg-white/10" />
            </div>
          </div>
        </div>
        <div className="hidden min-h-0 min-w-0 flex-1 md:block" aria-hidden />
      </div>
    </div>
  )
}

function AuthPageInner({ source }: { source: AuthPageSource }) {
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const error = searchParams.get('error')
  const { track } = useAnalytics()
  const entryPath = source === 'signup' ? '/signup' : '/login'
  const analyticsSource =
    source === 'signup' ? 'signup_page' : 'login_page'

  const handleSubmitClick = () => {
    track('login_started', {
      provider: 'google',
      source: analyticsSource,
    })
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background md:bg-black"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      {/* One backdrop-filter for header + left half; clip-path = 50% below header (matches md:w-1/2) */}
      <AuthGlassLayer />

      {/* md+: full-viewport collage behind header + strip */}
      <div className="hidden md:contents">
        <AuthDiningCollageViewport />
        {/* Soft fade on left half only — collage stays vivid on the right */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 top-0 z-[5] hidden w-1/2 md:block md:bg-[linear-gradient(90deg,rgb(0_0_0_/_0.82)_0%,rgb(0_0_0_/_0.52)_38%,rgb(0_0_0_/_0.22)_58%,transparent_100%)]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col md:flex-row md:items-stretch">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center md:w-1/2 md:shrink-0 md:items-center md:px-8 lg:px-12">
          <aside className="flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-y-auto max-md:justify-center max-md:pt-[calc(4rem+env(safe-area-inset-top,0px)+1.25rem)] md:mx-auto md:w-full md:items-center md:pt-0">
            <div
              className="mx-auto flex min-h-0 w-full max-w-md max-md:flex-none flex-col items-center justify-start bg-transparent px-6 pb-10 pt-0 sm:px-8 md:max-w-none md:flex-1 md:items-stretch md:justify-center md:px-8 md:py-12 md:pt-[calc(4rem+env(safe-area-inset-top,0px))]"
            >
            <div className="mx-auto w-full max-w-lg space-y-3 px-2 text-center">
              <h1
                className={cn(
                  'font-heading text-xl font-semibold leading-snug sm:text-2xl lg:text-3xl lg:leading-tight',
                  authHeading,
                )}
              >
                The ultimate UMich dining companion.
              </h1>
              <p
                className={cn(
                  'text-pretty text-sm leading-relaxed sm:text-base',
                  authBody,
                )}
              >
                Join thousands of Wolverines rating, reviewing, and tracking
                meals across campus.
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive md:border-red-400/40 md:bg-red-950/50 md:text-red-100"
              >
                {error}
              </p>
            ) : null}

            <ul className="mx-auto mt-8 w-full max-w-md space-y-4 text-center md:text-left">
              {benefits.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="flex justify-center gap-4 md:justify-start"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border backdrop-blur-sm md:bg-white/10 md:ring-white/10">
                    <Icon
                      className="h-4 w-4 text-primary md:text-maize"
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0 max-w-[min(100%,20rem)] pt-0.5 text-left md:max-w-none">
                    <p className={cn('font-medium', authBody)}>{title}</p>
                    <p className={cn('mt-0.5 text-sm leading-snug', authBodyMuted)}>
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 w-full max-w-md md:max-w-none">
              <form action="/auth/login" method="post" className="w-full">
                <input type="hidden" name="entry" value={entryPath} />
                {next ? (
                  <input type="hidden" name="next" value={next} />
                ) : null}
                <Button
                  type="submit"
                  className={cn(
                    'h-12 w-full gap-3 rounded-lg border text-base font-medium shadow-md',
                    'border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background',
                    'md:border-white/20 md:!bg-white md:!text-neutral-900 md:hover:!bg-white/90 md:hover:!text-neutral-900',
                  )}
                  onClick={handleSubmitClick}
                >
                  <img
                    src="/google-g.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="shrink-0"
                  />
                  Continue with Google
                </Button>
              </form>
              <p
                className={cn(
                  'mt-3 text-center text-xs',
                  authBody,
                )}
              >
                Requires a valid @umich.edu email address.
              </p>
            </div>

            <p
              className={cn(
                'mt-10 text-center text-[11px] leading-relaxed',
                authBody,
              )}
            >
              By continuing, you agree to our{' '}
              <Link
                href="/terms"
                className="underline underline-offset-2 transition-colors hover:text-maize"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="underline underline-offset-2 transition-colors hover:text-maize"
              >
                Privacy Policy
              </Link>
              .
            </p>
            </div>
          </aside>
        </div>

        {/* Spacer: collage shows through to the right (md+) */}
        <div className="hidden min-h-0 min-w-0 flex-1 md:block" aria-hidden />
      </div>
    </div>
  )
}

export function AuthPage({ source }: { source: AuthPageSource }) {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageInner source={source} />
    </Suspense>
  )
}
