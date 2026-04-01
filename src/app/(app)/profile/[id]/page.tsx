import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PublicProfileClient from './PublicProfileClient'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { id: targetId } = await params

  // Si c'est son propre profil → redirect vers /profile
  if (user?.id === targetId) redirect('/profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, level, xp, streak_current, player_type, favorite_genres, created_at')
    .eq('id', targetId)
    .single()

  if (!profile) notFound()

  const { data: library } = await supabase
    .from('library')
    .select('id, status, rating, games(name, cover_url, genres)')
    .eq('user_id', targetId)
    .order('updated_at', { ascending: false })
    .limit(8)

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_slug')
    .eq('user_id', targetId)

  const { count: total }     = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', targetId)
  const { count: completed } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', targetId).eq('status', 'completed')
  const { count: playing }   = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', targetId).eq('status', 'playing')

  const ratings = (library || []).filter(l => (l as any).rating).map(l => (l as any).rating)
  const avgRating = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1) : '—'

  // Vérifier si le viewer est ami avec ce profil
  let isFriend = false
  let hasPendingRequest = false

  if (user) {
    const { data: friendship } = await supabase
      .from('friendships')
      .select('status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (friendship?.status === 'accepted') isFriend = true
    if (friendship?.status === 'pending')  hasPendingRequest = true
  }

  return (
    <PublicProfileClient
      profile={profile}
      library={library || []}
      badges={badges || []}
      stats={{ total: total || 0, completed: completed || 0, playing: playing || 0, avgRating }}
      viewerId={user?.id || null}
      isFriend={isFriend}
      hasPendingRequest={hasPendingRequest}
      targetUserId={targetId}
    />
  )
}