'use client'

import { useCallback } from 'react'
import { usePostHog } from 'posthog-js/react'

export function useAnalytics() {
  const posthog = usePostHog()

  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (!posthog) return

    const allProperties = { ...properties }

    posthog.capture(eventName, allProperties)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${eventName}`, allProperties)
    }
  }, [posthog])

  const identify = useCallback((userId: string, traits?: Record<string, unknown>) => {
    if (!posthog) return
    posthog.identify(userId, traits)
  }, [posthog])

  const reset = useCallback(() => {
    if (!posthog) return
    posthog.reset()
  }, [posthog])

  return { track, identify, reset }
}
