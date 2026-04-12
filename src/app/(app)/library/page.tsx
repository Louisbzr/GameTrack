import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LibraryClient from './LibraryClient'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: library } = await supabase
    .from('library')
    .select('id, status, rating, review, is_favorite, updated_at, games(id, name, genres, cover_url, platforms, released_at)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, level, streak')
    .eq('id', user.id)
    .maybeSingle()

  const lib = library || []
  const stats = {
    total:     lib.length,
    completed: lib.filter((l: any) => l.status === 'completed').length,
    playing:   lib.filter((l: any) => l.status === 'playing').length,
    avgRating: lib.filter((l: any) => l.rating).length > 0
      ? (lib.reduce((a: number, l: any) => a + (l.rating ?? 0), 0) / lib.filter((l: any) => l.rating).length).toFixed(1)
      : '—',
  }

  return (
    <LibraryClient
      userId={user.id}
      library={lib as any}
      stats={stats}
      openAdd={false}
      xp={profile?.xp ?? 0}
      level={profile?.level ?? 1}
      streak={profile?.streak ?? 0}
    />
  )
}