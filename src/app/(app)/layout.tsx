import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import NotificationBell from '@/components/NotificationBell'
import { ThemeToggle } from '@/components/ThemeProvider'
import Link from 'next/link'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, xp, level, streak_current')
    .eq('id', user.id)
    .single()

  const { count: all }       = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const { count: playing }   = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'playing')
  const { count: completed } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed')
  const { count: backlog }   = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'backlog')
  const { count: dropped }   = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'dropped')

  const counts = {
    all:       all       || 0,
    playing:   playing   || 0,
    completed: completed || 0,
    backlog:   backlog   || 0,
    dropped:   dropped   || 0,
  }

  const sidebarProps = {
    username: profile?.username || user.email?.split('@')[0] || 'Joueur',
    xp:       profile?.xp             || 0,
    level:    profile?.level          || 1,
    streak:   profile?.streak_current || 0,
    counts,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-paper dark:bg-paper-dark">

      {/* Sidebar desktop */}
      <div className="hidden lg:flex flex-col sidebar-collapsible bg-side dark:bg-side-dark border-r border-surface dark:border-surface-dark">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Colonne principale */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Topbar desktop partagé ── */}
        <header className="hidden lg:flex items-center gap-3 px-6 h-14 flex-shrink-0 border-b border-surface dark:border-surface-dark bg-paper dark:bg-paper-dark">

          {/* Barre de recherche */}
          <Link
            href="/search"
            className="flex items-center gap-2.5 flex-1 max-w-sm bg-surface dark:bg-surface-dark rounded-[var(--radius-sm)] px-3.5 py-2 text-sm text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark transition-colors cursor-text group"
          >
            <span className="text-base opacity-60">⌕</span>
            <span className="text-[13px] text-ink-subtle group-hover:text-ink-muted dark:group-hover:text-ink-subtle transition-colors">
              Chercher un jeu, un joueur…
            </span>
            <kbd className="ml-auto text-[10px] font-mono bg-card dark:bg-card-dark text-ink-subtle px-1.5 py-0.5 rounded border border-surface dark:border-surface-dark">
              ⌘K
            </kbd>
          </Link>

          {/* Actions droite */}
          <div className="flex items-center gap-1 ml-auto">
            <ThemeToggle />
            <NotificationBell userId={user.id} />
          </div>
        </header>

        {/* Zone scrollable */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile nav */}
      <div className="lg:hidden">
        <MobileNav {...sidebarProps} />
      </div>
    </div>
  )
}