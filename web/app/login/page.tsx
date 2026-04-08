import type { Metadata } from 'next'
import { AuthPage } from '@/components/auth/AuthPage'

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in with your @umich.edu Google account to rate meals, track macros, and get smart menu matches on MaizeMeals.',
}

export default function LoginPage() {
  return <AuthPage source="login" />
}
