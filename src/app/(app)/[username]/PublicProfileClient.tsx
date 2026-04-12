'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ALL_BADGES = [
  { slug: 'first_blood',   emoji: '🏆', name: 'Premier sang',    rarity: 'common' },
  { slug: 'on_fire',       emoji: '🔥', name: 'En feu',          rarity: 'common' },
  { slug: 'veteran',       emoji: '⚔️', name: 'Vétéran',        rarity: 'rare' },
  { slug: 'critic',        emoji: '📝', name: 'Critique',        rarity: 'common' },
  { slug: 'legend',        emoji: '🌟', name: 'Légende',         rarity: 'epic' },
  { slug: 'rpg_king',      emoji: '👑', name: 'Roi du RPG',      rarity: 'rare' },
  { slug: 'explorer',      emoji: '🌍', name: 'Explorateur',     rarity: 'rare' },
  { slug: 'social',        emoji: '🤝', name: 'Social',          rarity: 'common' },
  { slug: 'perfectionist', emoji: '🎯', name: 'Perfectionniste', rarity: 'epic' },
]

const RARITY_BG: Record<string, string> = {
  common: 'bg-amber-bg dark:bg-amber-bg-dark',
  rare:   'bg-grape-bg',
  epic:   'bg-crimson-bg',
}
const RARITY_TEXT: Record<string, string> = {
  common: 'text-amber',
  rare:   'text-grape',
  epic:   'text-crimson',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Terminé', playing: 'En cours', backlog: 'À faire', dropped: 'Abandonné',
}

interface Props {
  profile: any
  library: any[]
  badges: any[]
  stats: { total: number; completed: number; playing: number; avgRating: string }
  viewerId: string | null  // null = visiteur non connecté
  isFriend: boolean
  hasPendingRequest: boolean
  targetUserId: string
  privacySettings?: {
    profilePublic: boolean
    showGameList: boolean
    showStats: boolean
    showActivity: boolean
  }
}

export default function PublicProfileClient({
  profile, library, badges, stats, viewerId, isFriend, hasPendingRequest, targetUserId, privacySettings
}: Props) {
  const privacy = privacySettings ?? { profilePublic: true, showGameList: true, showStats: true, showActivity: true }

  // If profile is private and viewer is not owner or friend
  const isOwner = viewerId === targetUserId
  const canView = isOwner || isFriend || privacy.profilePublic

  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>(
    isFriend ? 'friends' : hasPendingRequest ? 'pending' : 'none'
  )
  const router   = useRouter()
  const supabase = createClient()
  const unlockedSlugs = new Set(badges.map((b: any) => b.badge_slug))
  const username = profile?.username || 'Joueur'
  const level    = profile?.level    || 1
  const xp       = profile?.xp       || 0
  const xpNeeded  = level * 200
  const xpCurrent = xp % xpNeeded
  const xpPercent  = Math.round((xpCurrent / xpNeeded) * 100)
  const joinYear   = profile?.created_at ? new Date(profile.created_at).getFullYear() : '—'

  async function sendFriendRequest() {
    if (!viewerId) { router.push('/login'); return }
    await supabase.from('friendships').insert({ requester_id: viewerId, addressee_id: targetUserId, status: 'pending' })
    setFriendStatus('pending')
  }

  async function removeFriend() {
    if (!viewerId) return
    await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${viewerId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${viewerId})`)
    setFriendStatus('none')
  }

  const isOwnProfile = viewerId === targetUserId

  if (!canView) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-10 max-w-sm mx-auto border border-border">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Profil privé</h2>
          <p className="text-muted-foreground text-sm">Ce profil n'est visible que par ses amis.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6">

      {/* Back */}
      <Link href="/feed" className="text-sm text-ink-muted dark:text-ink-subtle hover:text-amber transition-colors mb-6 inline-block">
        ← Retour
      </Link>

      {/* Hero */}
      <div className="rounded-[var(--radius-xl)] p-6 mb-6 flex items-center gap-5 relative overflow-hidden" style={{ background: 'var(--color-ink)' }}>
        <div className="absolute right-4 bottom-0 font-serif font-black select-none leading-none pointer-events-none" style={{ fontSize: '100px', color: 'rgba(255,255,255,0.04)' }}>GT</div>
        <div className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-xl font-black flex-shrink-0 relative z-10"
          style={{ background: 'var(--color-amber)', color: 'var(--color-paper)' }}>
          {username.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <h1 className="font-serif text-2xl font-black text-white mb-0.5">{username}</h1>
          <p className="text-sm font-serif italic" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {profile?.player_type || 'Joueur'} · Membre depuis {joinYear}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full bg-amber rounded-full" style={{ width: `${xpPercent}%` }} />
            </div>
            <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{xpCurrent}/{xpNeeded} XP</span>
          </div>
        </div>
        <div className="relative z-10 text-right flex-shrink-0">
          <div className="font-serif text-4xl font-black leading-none text-amber">{level}</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Niveau</div>
        </div>
      </div>

      {/* Friend button */}
      {!isOwnProfile && viewerId && (
        <div className="flex justify-end mb-5">
          {friendStatus === 'friends' && (
            <button onClick={removeFriend}
              className="text-sm font-semibold text-forest bg-forest-bg px-4 py-2 rounded-[var(--radius-sm)] hover:bg-crimson-bg hover:text-crimson transition-colors">
              ✓ Amis · Retirer
            </button>
          )}
          {friendStatus === 'pending' && (
            <span className="text-sm font-semibold text-ink-subtle bg-surface dark:bg-surface-dark px-4 py-2 rounded-[var(--radius-sm)]">
              Demande envoyée…
            </span>
          )}
          {friendStatus === 'none' && (
            <button onClick={sendFriendRequest}
              className="text-sm font-semibold bg-amber text-black px-4 py-2 rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity">
              + Ajouter en ami
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {[
          { n: stats.total,     l: 'Total',    c: 'text-cobalt' },
          { n: stats.completed, l: 'Terminés', c: 'text-forest' },
          { n: stats.playing,   l: 'En cours', c: 'text-amber' },
          { n: stats.avgRating, l: 'Note moy.', c: 'text-crimson' },
        ].map(s => (
          <div key={s.l} className="bg-card dark:bg-card-dark rounded-[var(--radius-sm)] p-3.5 shadow-card text-center">
            <div className={`font-serif text-2xl font-black mb-0.5 ${s.c}`}>{s.n}</div>
            <div className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">Badges</h2>
          <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
          <span className="text-xs text-ink-subtle">{unlockedSlugs.size} / {ALL_BADGES.length}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {ALL_BADGES.map(b => {
            const unlocked = unlockedSlugs.has(b.slug)
            return (
              <div key={b.slug} className={`rounded-[var(--radius-md)] p-3.5 text-center shadow-card ${unlocked ? RARITY_BG[b.rarity] : 'bg-card dark:bg-card-dark'}`}
                style={{ opacity: unlocked ? 1 : 0.35 }}>
                <div className="text-3xl mb-2">{b.emoji}</div>
                <p className={`font-serif text-xs font-black ${unlocked ? RARITY_TEXT[b.rarity] : 'text-ink dark:text-ink-dark'}`}>{b.name}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Jeux récents */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">Jeux <em className="italic text-amber">récents</em></h2>
          <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
        </div>
        {library.length === 0 ? (
          <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic">Aucun jeu public</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {library.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 bg-card dark:bg-card-dark rounded-[var(--radius-sm)] px-4 py-3 shadow-card">
                <div className="w-12 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                  {item.games?.cover_url
                    ? <img src={item.games.cover_url} alt={item.games.name} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-lg">🎮</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm font-bold truncate text-ink dark:text-ink-dark">{item.games?.name}</p>
                  <p className="text-[10px] text-ink-subtle uppercase tracking-wider">{STATUS_LABELS[item.status] || item.status}</p>
                </div>
                {item.rating && <span className="text-xs text-amber font-bold flex-shrink-0">{'★'.repeat(item.rating)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}