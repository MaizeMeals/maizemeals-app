"use client"

import { PostHogProvider as PostHogReactProvider } from "posthog-js/react"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

  if (!apiKey) return <>{children}</>

  return (
    <PostHogReactProvider
      apiKey={apiKey}
      options={{
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: '2025-11-30',
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
      capture_pageview: true,
      }}
    >
      {children}
    </PostHogReactProvider>
  )
}
