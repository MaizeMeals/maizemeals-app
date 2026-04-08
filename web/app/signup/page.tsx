import type { Metadata } from 'next'
import { AuthPage } from '@/components/auth/AuthPage'

export const metadata: Metadata = {
  title: 'Create account',
  description:
    'Join MaizeMeals with your @umich.edu Google account. Rate dining halls, track nutrition, and get personalized recommendations.',
}

export default function SignupPage() {
  return <AuthPage source="signup" />
}
