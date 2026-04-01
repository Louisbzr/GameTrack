'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AddGameModal from '@/components/library/AddGameModal'

interface Props {
  username: string
  xp: number
  level: number
  streak: number
  counts: { all: number; playing: number; completed: number; backlog: number; dropped: number }
}

const NAV = [
  { href: '/library',  label: 'Jeux',      icon: '⊞' },
  { href: '/feed',     label: 'Social',     icon: '◎' },
  { href: '/discover', label: 'Découvrir',  icon: '✦' },
  { href: '/profile',  label: 'Profil',     icon: '◉' },
]

export default function MobileNav({ username, xp, level, streak, counts }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [showModal, setShowModal] = useState(false)

  const xpCurrent = xp % (level * 200)
  const xpNeeded  = level * 200

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-card dark:bg-card-dark border-b border-surface dark:border-surface-dark">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-serif text-base font-black text-amber leading-none">G</span>
          <span className="font-serif text-sm font-bold text-ink dark:text-ink-dark tracking-tight">ameTrack</span>
        </div>

        {/* Right side: streak + level + avatar */}
        <div className="flex items-center gap-2.5">
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-amber-bg dark:bg-amber-bg-dark px-2.5 py-1 rounded-full">
              <span className="text-xs">🔥</span>
              <span className="font-mono text-xs font-bold text-amber">{streak}j</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-surface dark:bg-surface-dark px-2.5 py-1 rounded-full">
            <span className="font-serif text-xs font-bold text-ink dark:text-ink-dark">Niv.{level}</span>
            <span className="text-[10px] text-amber font-semibold font-mono">{xpCurrent}/{xpNeeded}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-7 h-7 rounded-full bg-amber flex items-center justify-center font-serif text-[11px] font-bold text-paper active:scale-95 transition-transform"
            title="Se déconnecter"
          >
            {username.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-card dark:bg-card-dark flex items-center border-t border-surface dark:border-surface-dark"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.slice(0, 2).map(item => {
          const active = pathname === item.href || (item.href === '/library' && pathname.startsWith('/library'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors"
            >
              <span
                className="text-lg leading-none transition-opacity"
                style={{ opacity: active ? 1 : 0.35 }}
              >
                {item.icon}
              </span>
              <span
                className="text-[9px] font-semibold transition-colors"
                style={{ color: active ? 'var(--color-amber)' : 'var(--color-ink-subtle)' }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* ── FAB central ── */}
        <div className="flex-1 flex justify-center py-1.5">
          <button
            onClick={() => setShowModal(true)}
            className="w-12 h-12 rounded-full bg-ink dark:bg-card-dark text-paper dark:text-ink-dark text-xl font-bold shadow-hover transition-all active:scale-95 hover:bg-amber hover:text-black border border-surface dark:border-surface-dark flex items-center justify-center"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            +
          </button>
        </div>

        {NAV.slice(2).map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors"
            >
              <span
                className="text-lg leading-none transition-opacity"
                style={{ opacity: active ? 1 : 0.35 }}
              >
                {item.icon}
              </span>
              <span
                className="text-[9px] font-semibold transition-colors"
                style={{ color: active ? 'var(--color-amber)' : 'var(--color-ink-subtle)' }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* ── Modal ajout ── */}
      {showModal && (
        <AddGameModal
          userId=""
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); router.refresh() }}
        />
      )}
    </>
  )
}