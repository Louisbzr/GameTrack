import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/discover')

  // Stats
  const [usersRes, gamesRes, libRes, reportsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('games').select('id', { count: 'exact', head: true }),
    supabase.from('library').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }),
  ])

  // Reports with reporter info
  const { data: reports } = await supabase
    .from('reports')
    .select('*, profiles!reports_reporter_id_fkey(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, avatar_color, level, xp, is_admin, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <AdminClient
      stats={{
        users:   usersRes.count  ?? 0,
        games:   gamesRes.count  ?? 0,
        library: libRes.count    ?? 0,
        reports: reportsRes.count ?? 0,
      }}
      reports={reports ?? []}
      recentUsers={recentUsers ?? []}
    />
  )
}