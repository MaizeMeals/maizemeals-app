'use client'

import type { ReactNode } from 'react'

/** Wraps the site header; extend with pathname rules if some routes should hide it. */
export function ConditionalHeader({ children }: { children: ReactNode }) {
  return <>{children}</>
}
