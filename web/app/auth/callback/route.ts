// web/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPostHogClient } from '@/lib/posthog-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  const posthog = getPostHogClient()

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
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

      return NextResponse.redirect(`${origin}${next}`)
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
