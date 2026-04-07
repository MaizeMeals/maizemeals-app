// web/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPostHogClient } from '@/lib/posthog-server'
import { sanitizeAuthNextPath } from '@/lib/auth-next-path'
import { withSearchParams } from '@/lib/redirect-query'
import { syncUserProfileIdentity } from '@/lib/sync-user-profile-identity'

const AUTH_RETURN_COOKIE = 'auth_return_next'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(AUTH_RETURN_COOKIE)?.value ?? null
  const next = sanitizeAuthNextPath(fromCookie ?? searchParams.get('next'))

  const posthog = getPostHogClient()

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (fromCookie) {
        cookieStore.delete(AUTH_RETURN_COOKIE)
      }
      const { data: { user } } = await supabase.auth.getUser()

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

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
