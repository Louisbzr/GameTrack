import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiscoverClient from './DiscoverClient'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Jeux les mieux notés en base
  const { data: topGames } = await supabase
    .from('library')
    .select('rating, games(id, name, genres, cover_url, platforms, released_at)')
    .not('rating', 'is', null)
    .order('rating', { ascending: false })
    .limit(20)

  // Jeux récemment ajoutés par d'autres users
  const { data: recentGames } = await supabase
    .from('library')
    .select('created_at, games(id, name, genres, cover_url, released_at)')
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Jeux de l'utilisateur pour suggestions
  const { data: myLibrary } = await supabase
    .from('library')
    .select('games(genres)')
    .eq('user_id', user.id)

  const myGenres = myLibrary?.flatMap((l: any) => l.games?.genres || []) || []

  return (
    <DiscoverClient
      userId={user.id}
      topGames={topGames || []}
      recentGames={recentGames || []}
      myGenres={myGenres}
    />
  )
}