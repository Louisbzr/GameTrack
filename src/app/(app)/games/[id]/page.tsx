import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import GameDetailPublicClient from './GameDetailPublicClient'

interface Props { params: Promise<{ id: string }> }

export default async function GamePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: game } = await supabase.from('games').select('*').eq('id', id).single()
  if (!game) notFound()

  // Increment view count (fire and forget)
  supabase.rpc('increment_game_views', { game_id: id }).then(() => {})

  // Deduplicate game IDs
  let allGameIds: string[] = [id]
  if (game.igdb_id) {
    const { data: dups } = await supabase.from('games').select('id').eq('igdb_id', game.igdb_id)
    if (dups?.length) allGameIds = [...new Set([id, ...dups.map((g: any) => g.id)])]
  }
  if (allGameIds.length === 1) {
    const { data: byName } = await supabase.from('games').select('id').ilike('name', game.name)
    if (byName?.length) allGameIds = [...new Set([id, ...byName.map((g: any) => g.id)])]
  }

  // Fetch reviews + likes count + whether current user liked each
  const { data: reviewsRaw } = await supabase
    .from('library')
    .select(`
      id, user_id, rating, review, updated_at,
      profiles(username, avatar_color, avatar_url),
      review_likes(id, user_id)
    `)
    .in('game_id', allGameIds)
    .or('rating.not.is.null,review.not.is.null')
    .order('updated_at', { ascending: false })

  const reviews = (reviewsRaw ?? []).map((r: any) => ({
    ...r,
    likes: r.review_likes?.length ?? 0,
    likedByMe: r.review_likes?.some((l: any) => l.user_id === user.id) ?? false,
  }))

  const { data: myEntryRaw } = await supabase
    .from('library')
    .select('id, status, rating, review, is_favorite')
    .eq('user_id', user.id)
    .in('game_id', allGameIds)
    .order('updated_at', { ascending: false })
    .limit(1)

  const myEntry = myEntryRaw?.[0] ?? null

  let similar: any[] = []
  if (game.genres?.length > 0) {
    const { data } = await supabase.from('games').select('id, name, cover_url, released_at')
      .neq('id', id).contains('genres', [game.genres[0]]).limit(6)
    similar = data || []
  }
  if (similar.length < 4) {
    const { data } = await supabase.from('games').select('id, name, cover_url, released_at')
      .neq('id', id).limit(6 - similar.length)
    similar = [...similar, ...(data || [])]
  }

  return (
    <GameDetailPublicClient
      game={{ ...game, views: game.view_count ?? 0 }}
      reviews={reviews}
      myEntry={myEntry}
      similarGames={similar}
      userId={user.id}
    />
  )
}