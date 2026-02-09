import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HeaderContent } from '../HeaderContent'

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

  return <HeaderContent user={user} signOut={signOut} />
}
