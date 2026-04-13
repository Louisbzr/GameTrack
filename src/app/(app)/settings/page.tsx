import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_color, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <SettingsClient
      userId={user.id}
      username={profile?.username ?? user.email?.split('@')[0] ?? 'Joueur'}
      email={user.email}
      avatarUrl={profile?.avatar_url ?? null}
      avatarColor={profile?.avatar_color ?? 'forest'}
    />
  )
}