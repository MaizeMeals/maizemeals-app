"use client"

import posthog from "posthog-js"
import { useEffect } from "react"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      // Include the defaults option as required by PostHog
      defaults: '2025-11-30',
      // Enables capturing unhandled exceptions via Error Tracking
      capture_exceptions: true,
      // Turn on debug in development mode
      debug: process.env.NODE_ENV === "development",
      // This disables automatic capturing on the server (which would fail anyway)
      capture_pageview: false,
    });
  }, [])

  return <>{children}</>
}
