import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import Logo from './Logo'
import { ThemeToggle } from './theme-toggle'

export default async function Header() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const signOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <Logo />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {user ? (
          <form action={signOut}>
            <Button variant="outline">Logout</Button>
          </form>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
