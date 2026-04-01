'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface SidebarProps {
  username: string
  xp: number
  level: number
  streak: number
  counts: {
    all: number
    playing: number
    completed: number
    backlog: number
    dropped: number
  }
}

function xpForLevel(level: number) { return level * 200 }

const NAV = [
  { href: '/library',  label: 'Bibliothèque', icon: '⊞' },
  { href: '/feed',     label: 'Feed social',  icon: '◎' },
  { href: '/discover', label: 'Découverte',   icon: '✦' },
  { href: '/search',   label: 'Recherche',    icon: '⌕' },
  { href: '/lists',    label: 'Mes listes',   icon: '≡' },
  { href: '/profile',  label: 'Profil',  icon: '◉' },
]

export default function Sidebar({ username, xp, level, streak, counts }: SidebarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const xpNeeded  = xpForLevel(level)
  const xpCurrent = xp % xpNeeded
  const xpPercent = Math.round((xpCurrent / xpNeeded) * 100)
  const isLibrary = pathname === '/library' || pathname.startsWith('/library/')

  return (
    <aside className="flex flex-col h-full py-5 gap-1">

      {/* Logo */}
      <div className="sidebar-ni flex items-center px-4 mb-4 h-9 overflow-hidden flex-shrink-0">
        <span className="font-serif text-xl font-black text-amber flex-shrink-0 leading-none">G</span>
        <span className="logo-text font-serif text-base font-bold text-ink dark:text-ink-dark tracking-tight">
          ameTrack
        </span>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-0.5 px-2.5">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href === '/library' && isLibrary)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-ni flex items-center px-2.5 py-2.5 rounded-[10px] transition-colors duration-200 overflow-hidden ${
                active
                  ? 'bg-amber-bg dark:bg-amber-bg-dark text-amber'
                  : 'text-ink-muted dark:text-ink-subtle hover:bg-surface dark:hover:bg-surface-dark hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <span className="text-base w-5 flex-shrink-0 text-center leading-none">{item.icon}</span>
              <span className="nav-label text-[13px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="h-px bg-surface dark:bg-surface-dark mx-3 my-2 flex-shrink-0" />

      {/* Actions */}
      <div className="flex flex-col gap-0.5 px-2.5">
        <Link
          href="/library?add=true"
          className="sidebar-ni flex items-center px-2.5 py-2.5 rounded-[10px] text-forest hover:bg-forest-bg dark:hover:bg-forest-bg-dark transition-colors duration-200 overflow-hidden"
        >
          <span className="text-base w-5 flex-shrink-0 text-center leading-none">＋</span>
          <span className="nav-label text-[13px] font-semibold">Ajouter un jeu</span>
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-ni flex items-center px-2.5 py-2.5 rounded-[10px] text-ink-muted dark:text-ink-subtle hover:bg-crimson-bg hover:text-crimson transition-colors duration-200 overflow-hidden w-full text-left"
        >
          <span className="text-base w-5 flex-shrink-0 text-center leading-none">→</span>
          <span className="nav-label text-[13px] font-medium">Se déconnecter</span>
        </button>
      </div>

      <div className="flex-1" />

      {/* Streak */}
      {streak > 0 && (
        <div className="px-2.5 flex-shrink-0">
          <div className="streak-pill flex items-center bg-amber-bg dark:bg-amber-bg-dark rounded-[10px] px-2.5 py-2 overflow-hidden">
            <span className="text-sm flex-shrink-0 leading-none">🔥</span>
            <div className="xp-detail overflow-hidden">
              <span className="font-serif text-xs font-black text-amber">{streak}</span>
              <span className="text-[10px] text-amber/70 ml-1">jours de streak</span>
            </div>
          </div>
        </div>
      )}

      {/* XP pill */}
      <div className="px-2.5 flex-shrink-0">
        <div className="xp-pill-inner flex items-center bg-surface dark:bg-surface-dark rounded-[10px] px-2.5 py-2.5 overflow-hidden">
          <div className="relative flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber to-amber-light flex items-center justify-center text-[11px] font-bold text-paper">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute inset-[-2px] rounded-full border-2 border-amber opacity-40 pointer-events-none" />
          </div>
          <div className="xp-detail flex flex-col min-w-0 overflow-hidden">
            <span className="text-[12px] font-semibold text-ink dark:text-ink-dark truncate leading-tight">{username}</span>
            <span className="text-[11px] text-amber font-mono leading-tight">Niv.{level} · {xpCurrent} XP</span>
            <div className="h-[3px] bg-card dark:bg-card-dark rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-amber rounded-full transition-all duration-700" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

    </aside>
  )
}