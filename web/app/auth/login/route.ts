import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getURL } from '@/lib/get-url'
import { sanitizeAuthNextPath } from '@/lib/auth-next-path'

const AUTH_RETURN_COOKIE = 'auth_return_next'

export async function POST(request: Request) {
  const supabase = await createClient()
  const formData = await request.formData()
  const next = sanitizeAuthNextPath(formData.get('next') as string | null)
  const callbackUrl = `${getURL()}/auth/callback`

  const cookieStore = await cookies()
  if (next !== '/') {
    cookieStore.set(AUTH_RETURN_COOKIE, next, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
      path: '/',
    })
  } else {
    cookieStore.delete(AUTH_RETURN_COOKIE)
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: { hd: 'umich.edu' },
      redirectTo: callbackUrl,
    },
  })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=Could not authenticate user', request.url))
  }

  return NextResponse.redirect(data.url, { status: 303 })
}
