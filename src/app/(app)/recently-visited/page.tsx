// src/app/(app)/recently-visited/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecentlyVisitedClient from './RecentlyVisitedClient'

export const dynamic = 'force-dynamic'

export default async function RecentlyVisitedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: raw } = await supabase
    .from('game_views')
    .select('visited_at, games(id, name, cover_url, genres, platforms, released_at)')
    .eq('user_id', user.id)
    .order('visited_at', { ascending: false })
    .limit(100)

  const games = (raw || [])
    .map((r: any) => ({ ...r.games, visited_at: r.visited_at }))
    .filter(Boolean)

  return <RecentlyVisitedClient games={games} />
}