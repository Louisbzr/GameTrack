import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Amis
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships || []).map((f: any) =>
    f.requester_id === user.id ? f.receiver_id : f.requester_id
  )

  // Profils amis
  let friends: any[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, avatar_color')
      .in('id', friendIds)
    friends = data || []
  }

  // Événements du feed (moi + amis)
  const allIds = [user.id, ...friendIds]
  const { data: events } = await supabase
    .from('feed_events')
    .select('id, user_id, type, review, rating, created_at, profiles(id, username, avatar_url, avatar_color), games(id, name, cover_url, genres, released_at)')
    .in('user_id', allIds)
    .order('created_at', { ascending: false })
    .limit(30)

  // Jeux récemment ajoutés
  const { data: recentGames } = await supabase
    .from('library')
    .select('game_id, created_at, games(id, name, cover_url)')
    .in('user_id', allIds)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentGamesMapped = (recentGames || [])
    .filter((r: any) => r.games)
    .map((r: any) => {
      const prof = friends.find((f: any) => f.id === r.user_id)
      return {
        gameId: r.games.id,
        gameName: r.games.name,
        coverUrl: r.games.cover_url,
        username: prof?.username || 'Moi',
        userId: r.user_id,
        addedAt: r.created_at,
      }
    })

  return (
    <FeedClient
      userId={user.id}
      events={events || []}
      friends={friends}
      recentGames={recentGamesMapped}
    />
  )
}