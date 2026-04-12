import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingPage from './OnboardingClient'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, onboarded')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.onboarded) redirect('/discover')

  return (
    <OnboardingPage
      userId={user.id}
      username={profile?.username ?? user.email?.split('@')[0] ?? 'Joueur'}
    />
  )
}