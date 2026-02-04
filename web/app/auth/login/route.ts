import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        hd: 'umich.edu',
      },
      redirectTo: 'http://localhost:3000/auth/callback',
    },
  })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=Could not authenticate user', request.url))
  }

  return NextResponse.redirect(data.url, { status: 303 })
}
