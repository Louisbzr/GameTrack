// src/app/(app)/top-reviews/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopReviewsClient from './TopReviewsClient'

export const dynamic = 'force-dynamic'

export default async function TopReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupère tous les likes
  const { data: topLikedRaw } = await supabase
    .from('review_likes')
    .select('library_id, user_id')
    .limit(500)

  const likedIds = [...new Set((topLikedRaw || []).map((r: any) => r.library_id).filter(Boolean))]
  const likeCounts: Record<string, number> = {}
  for (const row of topLikedRaw || []) {
    if (row.library_id) likeCounts[row.library_id] = (likeCounts[row.library_id] || 0) + 1
  }

  let reviews: any[] = []
  if (likedIds.length > 0) {
    const { data: likedReviews } = await supabase
      .from('library')
      .select('id, user_id, review, rating, updated_at, profiles(username, avatar_color, avatar_url), games(id, name, cover_url, genres)')
      .in('id', likedIds)
      .not('review', 'is', null)

    reviews = (likedReviews || [])
      .map(r => ({
        ...r,
        likes:     likeCounts[r.id] ?? 0,
        likedByMe: (topLikedRaw || []).some((l: any) => l.library_id === r.id && l.user_id === user.id),
      }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 20)
  }

  return <TopReviewsClient reviews={reviews} userId={user.id} />
}