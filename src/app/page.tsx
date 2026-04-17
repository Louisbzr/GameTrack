import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingClient from '@/components/LandingClient'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/discover')

  // Visiteur non connecté → landing
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