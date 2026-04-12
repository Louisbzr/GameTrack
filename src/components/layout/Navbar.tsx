import { createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_color, avatar_url')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  return (
    <NavbarClient
      username={profile?.username ?? user?.email?.split('@')[0] ?? 'Joueur'}
      avatarColor={profile?.avatar_color ?? 'forest'}
      avatarUrl={profile?.avatar_url ?? null}
      userId={user?.id ?? ''}
    />
  )
}