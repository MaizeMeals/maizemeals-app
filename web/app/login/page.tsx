'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAnalytics } from '@/hooks/use-analytics'

function LoginForm() {
  const { track } = useAnalytics()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

  const handleLoginClick = () => {
    track('login_started', {
      provider: 'google',
      source: 'login_page'
    })
  }

  return (
    <form action="/auth/login" method="post">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button className="mt-4" variant="outline" onClick={handleLoginClick}>
        Sign in with Google
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold">
          Welcome to MaizeMeals
        </h1>
        <p className="mt-3 text-lg">
          Please sign in with your umich.edu Google account to continue.
        </p>
        <Suspense fallback={<div className="mt-4 h-10 w-40 rounded-md bg-muted animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}
