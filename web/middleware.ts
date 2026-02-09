import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /monitoring (Sentry tunnel, if you ever use it)
     * - /ingest (PostHog proxy, if you use it)
     */
    '/((?!_next/static|_next/image|favicon.ico|monitoring|ingest).*)',
  ],
}
