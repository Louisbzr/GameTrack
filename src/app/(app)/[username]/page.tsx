import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicProfileClient from './PublicProfileClient'

interface Props { params: Promise<{ username: string }> }

export const dynamic = 'force-dynamic'

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // Viewer
  const { data: { user: viewer } } = await supabase.auth.getUser()

  // Target profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle()

  if (!profile) notFound()

  // Library (all entries for stats/favorites)
  const { data: library } = await supabase
    .from('library')
    .select('id, status, rating, review, is_favorite, updated_at, games(id, name, cover_url, genres)')
    .eq('user_id', profile.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  // Reviews & rated games specifically
  const { data: reviews } = await supabase
    .from('library')
    .select('id, status, rating, review, updated_at, games(id, name, cover_url)')
    .eq('user_id', profile.id)
    .or('review.not.is.null,rating.not.is.null')
    .order('updated_at', { ascending: false })
    .limit(50)

  // Badges
  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_slug')
    .eq('user_id', profile.id)

  // Stats
  const { data: allLib } = await supabase
    .from('library')
    .select('status, rating')
    .eq('user_id', profile.id)

  const total     = allLib?.length ?? 0
  const completed = allLib?.filter((l: any) => l.status === 'completed').length ?? 0
  const playing   = allLib?.filter((l: any) => l.status === 'playing').length ?? 0
  const ratings   = allLib?.map((l: any) => l.rating).filter(Boolean) ?? []
  const avgRating = ratings.length
    ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length / 2).toFixed(1)
    : '—'

  // Friendship status
  let isFriend = false
  let hasPendingRequest = false
  if (viewer && viewer.id !== profile.id) {
    const { data: friendship } = await supabase
      .from('friendships')
      .select('status, requester_id')
      .or(`and(requester_id.eq.${viewer.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${viewer.id})`)
      .maybeSingle()

    if (friendship?.status === 'accepted') isFriend = true
    if (friendship?.status === 'pending' && friendship.requester_id === viewer.id) hasPendingRequest = true
  }

  // Privacy settings
  const settings = profile.settings ?? {}
  const privacySettings = {
    profilePublic: settings.profilePublic ?? true,
    showGameList:  settings.showGameList  ?? true,
    showStats:     settings.showStats     ?? true,
    showActivity:  settings.showActivity  ?? true,
  }

  return (
    <PublicProfileClient
      profile={profile}
      library={library ?? []}
      reviews={reviews ?? []}
      badges={badges ?? []}
      stats={{ total, completed, playing, avgRating }}
      viewerId={viewer?.id ?? null}
      isFriend={isFriend}
      hasPendingRequest={hasPendingRequest}
      targetUserId={profile.id}
      privacySettings={privacySettings}
    />
  )
}