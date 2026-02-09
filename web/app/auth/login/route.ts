import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getURL } from '@/lib/get-url'

export async function POST(request: Request) {
  const supabase = await createClient()
  const callbackUrl = `${getURL()}/auth/callback`

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
