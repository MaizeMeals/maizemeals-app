/** OAuth error redirect target: only login or signup routes. */
export function sanitizeAuthEntryPath(raw: string | null): '/login' | '/signup' {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return s === '/signup' ? '/signup' : '/login'
}

/** Safe in-app path for post-OAuth redirect (open-redirect hardening). */
export function sanitizeAuthNextPath(raw: string | null): string {
  if (!raw || typeof raw !== 'string') return '/'
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/'
  if (trimmed.includes('\n') || trimmed.includes('\r')) return '/'
  return trimmed.length > 2048 ? '/' : trimmed
}
