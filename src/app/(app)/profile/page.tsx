import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: library } = await supabase
    .from('library')
    .select('*, games(name, genres, cover_url)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_slug, unlocked_at')
    .eq('user_id', user.id)

  const { data: xpHistory } = await supabase
    .from('xp_transactions')
    .select('amount, reason, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { count: total } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const { count: completed } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed')
  const { count: playing } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'playing')

  const ratings = library?.filter(l => (l as any).rating).map(l => (l as any).rating) || []
  const avgRating = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1) : '—'

  return (
    <ProfileClient
      profile={profile}
      library={library || []}
      badges={badges || []}
      xpHistory={xpHistory || []}
      stats={{ total: total || 0, completed: completed || 0, playing: playing || 0, avgRating }}
    />
  )
}