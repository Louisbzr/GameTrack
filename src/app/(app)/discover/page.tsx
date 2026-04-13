import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Top jeux notés (hero + tendances) — toute la communauté
  const { data: topGames } = await supabase
    .from('library')
    .select('rating, games(id, name, genres, cover_url, platforms, released_at)')
    .not('rating', 'is', null)
    .order('rating', { ascending: false })
    .limit(20)

  // Sorties récentes (toute la communauté)
  const { data: recentGames } = await supabase
    .from('library')
    .select('created_at, games(id, name, genres, cover_url, released_at, platforms)')
    .order('created_at', { ascending: false })
    .limit(8)

  // Bibliothèque de l'utilisateur connecté (pour "Tous les jeux")
  const { data: myLibrary } = await supabase
    .from('library')
    .select('games(id, name, genres, cover_url, platforms, released_at)')
    .eq('user_id', user.id)

  // Amis
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships || []).map((f: any) =>
    f.requester_id === user.id ? f.receiver_id : f.requester_id
  )

  // Avis d'amis
  let friendReviews: any[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('library')
      .select('id, user_id, review, rating, updated_at, profiles(username, avatar_color, avatar_url), games(id, name, cover_url), review_likes(id, user_id)')
      .in('user_id', friendIds)
      .not('review', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(3)
    friendReviews = data || []
  }



  // Jeux populaires - triés par vues réelles
  const { data: popularGamesRaw } = await supabase
    .from('games')
    .select('id, name, cover_url, genres, view_count')
    .gt('view_count', 0)
    .order('view_count', { ascending: false })
    .limit(5)

  const popular = (popularGamesRaw || []).map(g => ({
    game: g,
    count: g.view_count ?? 0
  }))

  function unique(items: any[]) {
    const seen = new Set()
    return items.filter(i => {
      const g = i.games
      if (!g || seen.has(g.id)) return false
      seen.add(g.id)
      return true
    })
  }

  const uTop = unique(topGames || [])

  // Jeux de l'utilisateur — dédupliqués
  const myGames = unique(myLibrary || []).map((i: any) => i.games).filter(Boolean)

  // Map likes onto reviews
  const mapLikes = (reviews: any[]) => reviews.map(r => ({
    ...r,
    likes: r.review_likes?.length ?? 0,
    likedByMe: r.review_likes?.some((l: any) => l.user_id === user.id) ?? false,
  }))

  return (
    <HomeClient
      userId={user.id}
      featuredGame={uTop[0]?.games ?? null}
      featuredRating={uTop[0]?.rating ?? null}
      trendingGames={uTop.slice(0, 6).map((i: any) => i.games)}
      allGames={myGames}
      weeklyReleases={unique(recentGames || []).slice(0, 3)}
      friendReviews={mapLikes(friendReviews)}
      popularGames={popular}
    />
  )
}