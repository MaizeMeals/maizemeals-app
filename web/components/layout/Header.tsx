import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HeaderContent } from '@/components/layout/HeaderContent'
import { isAdminUserId } from '@/lib/supabase/admin'

export default async function Header() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = Boolean(user && isAdminUserId(user.id))

  const signOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return <HeaderContent user={user} signOut={signOut} isAdmin={isAdmin} />
}
