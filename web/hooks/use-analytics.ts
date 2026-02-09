'use client'

import { usePostHog } from 'posthog-js/react'

export function useAnalytics() {
  const posthog = usePostHog()

  const track = (eventName: string, properties?: Record<string, any>) => {
    if (!posthog) return

    const allProperties = { ...properties }

    posthog.capture(eventName, allProperties)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${eventName}`, allProperties)
    }
  }

  const identify = (userId: string, traits?: Record<string, any>) => {
    if (!posthog) return
    posthog.identify(userId, traits)
  }

  const reset = () => {
    if (!posthog) return
    posthog.reset()
  }

  return { track, identify, reset }
}
