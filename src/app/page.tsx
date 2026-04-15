// src/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingClient from '@/components/LandingClient'
import HomeClient from '@/components/HomeClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // ── Visiteur non connecté → landing avec vraies stats ─────────────────────
  if (!user) {
    // Ces 4 requêtes COUNT sont légères et ne nécessitent pas d'auth
    const [
      { count: gamesCount },
      { count: libraryCount },
      { count: reviewsCount },
      { count: usersCount },
    ] = await Promise.all([
      supabase.from('games').select('*', { count: 'exact', head: true }),
      supabase.from('library').select('*', { count: 'exact', head: true }),
      supabase.from('library').select('*', { count: 'exact', head: true }).not('review', 'is', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    return (
      <LandingClient
        stats={{
          games:   gamesCount   ?? 0,
          library: libraryCount ?? 0,
          reviews: reviewsCount ?? 0,
          users:   usersCount   ?? 0,
        }}
      />
    )
  }

  // ── Connecté mais onboarding non fait ─────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded, username')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.onboarded) {
    redirect('/onboarding')
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const { data: topRated } = await supabase
    .from('library')
    .select('rating, games(id, name, cover_url, genres, platforms)')
    .not('rating', 'is', null)
    .not('games', 'is', null)
    .order('rating', { ascending: false })
    .limit(1)

  const featuredGame   = (topRated?.[0]?.games as any) ?? null
  const featuredRating = topRated?.[0]?.rating
    ? Number(topRated[0].rating) / 2
    : null

  const { data: trendingRaw } = await supabase
    .from('library')
    .select('game_id, games(id, name, cover_url, genres)')
    .not('games', 'is', null)
    .limit(200)

  const countMap: Record<string, { count: number; game: any }> = {}
  for (const row of trendingRaw ?? []) {
    const g = row.games as any
    if (!g) continue
    if (!countMap[row.game_id]) countMap[row.game_id] = { count: 0, game: g }
    countMap[row.game_id].count++
  }
  const popularGames = Object.values(countMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  const trendingGames = popularGames.slice(0, 6).map(x => x.game)

  const { data: allGames } = await supabase
    .from('games')
    .select('id, name, cover_url, genres')
    .order('name')
    .limit(64)

  let friendReviews: any[] = []
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  if (friendships && friendships.length > 0) {
    const friendIds = friendships.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    )
    const { data: reviews } = await supabase
      .from('library')
      .select('id, rating, review, updated_at, likes, game_id, user_id, games(id, name, cover_url), profiles(username, avatar_color, avatar_url)')
      .in('user_id', friendIds)
      .not('review', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(9)
    friendReviews = reviews ?? []
  }

  return (
    <HomeClient
      userId={user.id}
      featuredGame={featuredGame}
      featuredRating={featuredRating}
      trendingGames={trendingGames}
      allGames={allGames ?? []}
      weeklyReleases={[]}
      friendReviews={friendReviews}
      popularGames={popularGames.slice(0, 5)}
    />
  )
}