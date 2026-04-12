import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import GameDetailClient from './GameDetailClient'

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  // Entrée de la bibliothèque
  const { data: entry } = await supabase
    .from('library')
    .select(`
      id, status, rating, review, started_at, completed_at, created_at, updated_at,
      games(id, name, slug, cover_url, genres, platforms, released_at, metacritic, rawg_id)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!entry) notFound()

  const gameId = (entry as any).games?.id

  // Récupérer les amis de l'utilisateur
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships || []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  // Activité des amis sur ce jeu
  const { data: friendActivity } = friendIds.length > 0
    ? await supabase
        .from('library')
        .select('rating, review, status, profiles(id, username)')
        .eq('game_id', gameId)
        .in('user_id', friendIds)
    : { data: [] }

  // Stats globales via la vue game_stats
  const { data: gameStats } = await supabase
    .from('game_stats')
    .select('*')
    .eq('game_id', gameId)
    .single()

  // Critiques communauté (hors user, avec like_count si disponible)
  const { data: communityReviews } = await supabase
    .from('library')
    .select('rating, review, status, profiles(username)')
    .eq('game_id', gameId)
    .neq('user_id', user.id)
    .not('review', 'is', null)
    .order('rating', { ascending: false })
    .limit(20)

  return (
    <GameDetailClient
      entry={entry as any}
      userId={user.id}
      communityReviews={(communityReviews || []) as any}
      friendActivity={(friendActivity || []) as any}
      gameStats={gameStats || null}
    />
  )
}