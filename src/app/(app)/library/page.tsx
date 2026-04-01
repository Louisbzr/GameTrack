import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LibraryClient from './LibraryClient'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; add?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status || ''

  let query = supabase
    .from('library')
    .select(`*, games(id, name, genres, cover_url, platforms, released_at)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: library } = await query

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, level, streak_current')
    .eq('id', user.id)
    .single()

  // Stats
  const { count: total } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const { count: completed } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed')
  const { count: playing } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'playing')

  const ratings = library?.filter(l => l.rating).map(l => l.rating) || []
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—'

  return (
    <LibraryClient
      userId={user.id}
      library={library || []}
      stats={{ total: total || 0, completed: completed || 0, playing: playing || 0, avgRating }}
      openAdd={params.add === 'true'}
      xp={profile?.xp || 0}
      level={profile?.level || 1}
      streak={profile?.streak_current || 0}
    />
  )
}