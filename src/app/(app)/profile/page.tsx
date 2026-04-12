import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // Include is_favorite in library select
  const { data: library } = await supabase
    .from('library')
    .select('id, status, rating, review, is_favorite, updated_at, games(id, name, genres, cover_url, platforms, released_at)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_slug, earned_at')
    .eq('user_id', user.id)

  const { data: xpHistory } = await supabase
    .from('xp_transactions')
    .select('amount, reason, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const lib = library || []
  const stats = {
    total:     lib.length,
    completed: lib.filter((l: any) => l.status === 'completed').length,
    playing:   lib.filter((l: any) => l.status === 'playing').length,
    avgRating: lib.filter((l: any) => l.rating).length > 0
      ? (lib.reduce((s: number, l: any) => s + (l.rating ?? 0), 0) / lib.filter((l: any) => l.rating).length).toFixed(1)
      : '—',
  }

  return (
    <ProfileClient
      profile={profile}
      library={lib}
      badges={badges || []}
      xpHistory={xpHistory || []}
      stats={stats}
    />
  )
}