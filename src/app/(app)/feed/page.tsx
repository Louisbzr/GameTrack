import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupère les amis acceptés
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships || []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  // Feed = activité récente de l'utilisateur + amis
  // On requête library directement (plus fiable que feed_events sans library_id)
  const allUserIds = [user.id, ...friendIds]

  const { data: libraryEvents } = await supabase
    .from('library')
    .select(`
      id, status, rating, review, created_at, updated_at, user_id,
      games(id, name, genres, cover_url),
      profiles(id, username, avatar_url)
    `)
    .in('user_id', allUserIds)
    .order('updated_at', { ascending: false })
    .limit(30)

  // Amis pour le panel latéral
  const { data: friendProfiles } = friendIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', friendIds)
    : { data: [] }

  // Jeux récemment ajoutés par des amis
  const { data: recentByFriends } = friendIds.length > 0
    ? await supabase
        .from('library')
        .select('game_id, created_at, games(id, name, cover_url), profiles(id, username)')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(8)
    : { data: [] }

  const recentGames = (recentByFriends || [])
    .filter((r: any) => r.games)
    .map((r: any) => ({
      gameId:   r.games.id,
      gameName: r.games.name,
      coverUrl: r.games.cover_url,
      username: Array.isArray(r.profiles) ? r.profiles[0]?.username : r.profiles?.username,
      userId:   Array.isArray(r.profiles) ? r.profiles[0]?.id       : r.profiles?.id,
      addedAt:  r.created_at,
    }))

  // Formater les events comme avant pour FeedClient
  const events = (libraryEvents || []).map((l: any) => ({
    id:         l.id,
    event_type: l.status,
    created_at: l.updated_at || l.created_at,
    profiles:   l.profiles,
    library:    {
      status: l.status,
      rating: l.rating,
      review: l.review,
      games:  l.games,
    },
  }))

  return (
    <FeedClient
      userId={user.id}
      events={events}
      friends={friendProfiles || []}
      recentGames={recentGames}
    />
  )
}