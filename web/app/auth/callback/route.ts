// web/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPostHogClient } from '@/lib/posthog-server'
import { sanitizeAuthNextPath } from '@/lib/auth-next-path'
import { withSearchParams } from '@/lib/redirect-query'
import { syncUserProfileIdentity } from '@/lib/sync-user-profile-identity'

const AUTH_RETURN_COOKIE = 'auth_return_next'
const UMICH_ONLY_MESSAGE = 'MaizeMeals is only available to @umich.edu Google accounts.'
const GENERIC_FAILURE_MESSAGE = 'Sign-in failed. Please try again.'

function isUmichEmail(email: string | undefined | null): boolean {
  return (email?.split('@')[1] ?? '').toLowerCase() === 'umich.edu'
}

function loginErrorRedirect(origin: string, message: string) {
  const url = new URL('/login', origin)
  url.searchParams.set('error', message)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(AUTH_RETURN_COOKIE)?.value ?? null
  const next = sanitizeAuthNextPath(fromCookie ?? searchParams.get('next'))

  const posthog = getPostHogClient()

  // Supabase redirects here with ?error=... when sign-up is rejected, e.g. by
  // the @umich.edu trigger on auth.users ("Database error saving new user").
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  if (!code && providerError) {
    const rejectedSignup = /database error saving new user|umich/i.test(providerError)
    return loginErrorRedirect(origin, rejectedSignup ? UMICH_ONLY_MESSAGE : GENERIC_FAILURE_MESSAGE)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (fromCookie) {
        cookieStore.delete(AUTH_RETURN_COOKIE)
      }
      const { data: { user } } = await supabase.auth.getUser()

      // `hd=umich.edu` on the OAuth request is only a hint to Google; enforce
      // the domain server-side too (the database trigger is the hard lock).
      if (user && !isUmichEmail(user.email)) {
        await supabase.auth.signOut()
        await posthog.shutdown()
        return loginErrorRedirect(origin, UMICH_ONLY_MESSAGE)
      }

      if (user) {
        const profileSync = await syncUserProfileIdentity(supabase, user)
        if (!profileSync.ok) {
          console.error('[auth/callback] syncUserProfileIdentity failed:', profileSync.error)
        }

        posthog.identify({
          distinctId: user.id, // The only thing that matters
          properties: {
            provider: 'google',
          }
        })

        posthog.capture({
          distinctId: user.id,
          event: 'login_completed',
          properties: {
            provider: 'google',
            email_domain: user.email?.split('@')[1],
            source: 'oauth_callback'
          }
        })
      }

      await posthog.shutdown()

      const destination = withSearchParams(next, { signed_in: '1' })
      return NextResponse.redirect(`${origin}${destination}`)
    } else {
      posthog.capture({
        distinctId: 'anonymous',
        event: 'login_failed',
        properties: {
          error: error.message,
          provider: 'google',
          source: 'oauth_callback'
        }
      })

      await posthog.shutdown()
    }
  }

  return loginErrorRedirect(origin, GENERIC_FAILURE_MESSAGE)
}
