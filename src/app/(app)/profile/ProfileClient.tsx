'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

const ALL_BADGES = [
  { slug: 'first_blood',   emoji: '🏆', name: 'Premier sang',    desc: '1er jeu terminé',        rarity: 'common' },
  { slug: 'on_fire',       emoji: '🔥', name: 'En feu',          desc: '7 jours de streak',      rarity: 'common' },
  { slug: 'veteran',       emoji: '⚔️', name: 'Vétéran',        desc: '50 jeux terminés',       rarity: 'rare' },
  { slug: 'critic',        emoji: '📝', name: 'Critique',        desc: '10 reviews écrites',     rarity: 'common' },
  { slug: 'legend',        emoji: '🌟', name: 'Légende',         desc: 'Niveau 50 atteint',      rarity: 'epic' },
  { slug: 'rpg_king',      emoji: '👑', name: 'Roi du RPG',      desc: '20 RPG terminés',        rarity: 'rare' },
  { slug: 'explorer',      emoji: '🌍', name: 'Explorateur',     desc: '10 genres différents',   rarity: 'rare' },
  { slug: 'social',        emoji: '🤝', name: 'Social',          desc: '50 commentaires',        rarity: 'common' },
  { slug: 'perfectionist', emoji: '🎯', name: 'Perfectionniste', desc: 'Streak de 30 jours',     rarity: 'epic' },
]

const RARITY_BG: Record<string, string>   = { common: 'bg-amber-bg dark:bg-amber-bg-dark', rare: 'bg-grape-bg', epic: 'bg-crimson-bg' }
const RARITY_TEXT: Record<string, string> = { common: 'text-amber', rare: 'text-grape', epic: 'text-crimson' }

const AVATAR_COLORS = [
  { key: 'amber',   label: 'Ambre',   bg: 'bg-gradient-to-br from-amber to-amber-light' },
  { key: 'forest',  label: 'Forêt',   bg: 'bg-gradient-to-br from-forest to-green-600' },
  { key: 'cobalt',  label: 'Cobalt',  bg: 'bg-gradient-to-br from-cobalt to-blue-600' },
  { key: 'crimson', label: 'Cramoisi',bg: 'bg-gradient-to-br from-crimson to-rose-600' },
  { key: 'grape',   label: 'Raisin',  bg: 'bg-gradient-to-br from-grape to-purple-600' },
  { key: 'ink',     label: 'Encre',   bg: 'bg-gradient-to-br from-ink to-ink-muted' },
]

const XP_REASONS: Record<string, string> = {
  welcome_bonus:  '🎉 Bonus de bienvenue',
  game_added:     '🎮 Jeu ajouté',
  game_completed: '🏆 Jeu terminé',
  review_written: '📝 Review écrite',
  comment_posted: '🤝 Commentaire posté',
  daily_streak:   '🔥 Streak quotidien',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Terminé', playing: 'En cours', backlog: 'À faire', dropped: 'Abandonné',
}

interface Props {
  profile: any
  library: any[]
  badges: any[]
  xpHistory: any[]
  stats: { total: number; completed: number; playing: number; avgRating: string }
}

function getAvatarBg(color: string) {
  return AVATAR_COLORS.find(c => c.key === color)?.bg || AVATAR_COLORS[0].bg
}

export default function ProfileClient({ profile, library, badges, xpHistory, stats }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const unlockedSlugs = new Set(badges.map((b: any) => b.badge_slug))
  const level      = profile?.level          || 1
  const xp         = profile?.xp             || 0
  const xpNeeded   = level * 200
  const xpCurrent  = xp % xpNeeded
  const xpPercent  = Math.round((xpCurrent / xpNeeded) * 100)
  const streak     = profile?.streak_current || 0
  const username   = profile?.username       || 'Joueur'
  const joinYear   = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear()
  const steamId    = profile?.steam_id       || null
  const avatarColor = profile?.avatar_color  || 'amber'

  // Edit modal state
  const [showEdit,     setShowEdit]     = useState(false)
  const [editUsername, setEditUsername] = useState(username)
  const [editBio,      setEditBio]      = useState(profile?.bio || '')
  const [editColor,    setEditColor]    = useState(avatarColor)
  const [saving,       setSaving]       = useState(false)
  const [savedMsg,     setSavedMsg]     = useState('')

  const days    = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function saveProfile() {
    if (!editUsername.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({
      username:     editUsername.trim(),
      bio:          editBio.trim() || null,
      avatar_color: editColor,
      updated_at:   new Date().toISOString(),
    }).eq('id', profile.id)
    setSaving(false)
    setSavedMsg('✓ Profil mis à jour !')
    setTimeout(() => { setSavedMsg(''); setShowEdit(false); router.refresh() }, 1200)
  }

  // Formater une entrée XP avec le nom du jeu si dispo
  function formatXpEntry(tx: any) {
    const reason = XP_REASONS[tx.reason] || tx.reason
    const gameName = tx.metadata?.game_name
    if (gameName && (tx.reason === 'game_added' || tx.reason === 'game_completed' || tx.reason === 'review_written')) {
      return `${reason} — ${gameName}`
    }
    return reason
  }

  return (
    <div className="flex h-full">

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 lg:p-7">

          {/* Hero */}
          <div className="rounded-[var(--radius-xl)] p-5 lg:p-6 mb-6 flex items-center gap-4 lg:gap-5 relative overflow-hidden" style={{ background: 'var(--color-ink)' }}>
            <div className="absolute right-4 bottom-0 font-serif font-black select-none leading-none pointer-events-none" style={{ fontSize: '100px', color: 'rgba(255,255,255,0.04)' }}>GT</div>
            <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center font-serif text-lg lg:text-xl font-black flex-shrink-0 relative z-10 ${getAvatarBg(avatarColor)}`}
              style={{ color: 'var(--color-paper)' }}>
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <h1 className="font-serif text-xl lg:text-2xl font-black mb-0.5 text-white leading-tight">{username}</h1>
              <p className="text-sm font-serif italic" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {profile?.player_type || 'Joueur passionné'} · Membre depuis {joinYear}
              </p>
              {profile?.bio && (
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{profile.bio}</p>
              )}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div className="h-full bg-amber rounded-full transition-all duration-700" style={{ width: `${xpPercent}%` }} />
                </div>
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{xpCurrent}/{xpNeeded} XP</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0 relative z-10">
              <div className="text-right">
                <div className="font-serif text-3xl lg:text-4xl font-black leading-none text-amber">{level}</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Niveau</div>
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                ✏️ Modifier
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {[
              { n: stats.total,     l: 'Total',    c: 'text-cobalt' },
              { n: stats.completed, l: 'Terminés', c: 'text-forest' },
              { n: stats.playing,   l: 'En cours', c: 'text-amber' },
              { n: stats.avgRating, l: 'Note moy.', c: 'text-crimson' },
            ].map(s => (
              <div key={s.l} className="bg-card dark:bg-card-dark rounded-[var(--radius-sm)] p-3.5 shadow-card">
                <div className={`font-serif text-2xl lg:text-3xl font-black mb-0.5 ${s.c}`}>{s.n}</div>
                <div className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>

          {/* XP + Streak */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

            {/* XP + historique */}
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-4 lg:p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-sm font-black text-ink dark:text-ink-dark">Progression <em className="italic text-amber">XP</em></h3>
                <span className="font-serif text-lg font-black text-amber">{xpCurrent.toLocaleString()} XP</span>
              </div>
              <div className="h-2.5 bg-surface dark:bg-surface-dark rounded-full overflow-hidden mb-2">
                <div className="h-full bg-amber rounded-full transition-all duration-700" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-ink-subtle mb-4">
                <span className="text-amber font-semibold">{xpCurrent} / {xpNeeded} XP</span>
                <span>{xpNeeded - xpCurrent} pour niveau {level + 1}</span>
              </div>

              {xpHistory.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-surface dark:border-surface-dark">
                  <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mb-1">Historique</p>
                  {xpHistory.map((tx: any, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-surface dark:border-surface-dark last:border-0">
                      {/* Cover du jeu si dispo */}
                      {tx.metadata?.game_name && (
                        <div className="text-sm flex-shrink-0">
                          {tx.reason === 'game_added' ? '🎮' : tx.reason === 'game_completed' ? '🏆' : tx.reason === 'review_written' ? '📝' : '⭐'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink-muted dark:text-ink-subtle truncate">
                          {formatXpEntry(tx)}
                        </p>
                        <p className="text-[10px] text-ink-subtle">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-amber text-xs flex-shrink-0">+{tx.amount} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Streak */}
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-4 lg:p-5 shadow-card">
              <h3 className="font-serif text-sm font-black mb-4 text-ink dark:text-ink-dark">Streak <em className="italic text-amber">quotidien</em></h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-serif text-3xl font-black text-amber">🔥 {streak}</span>
                <span className="text-sm text-ink-muted dark:text-ink-subtle">jours consécutifs</span>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {days.map((d, i) => {
                  const isActive = streak > 0 && i <= todayIdx && i >= Math.max(0, todayIdx - streak + 1)
                  const isToday  = i === todayIdx
                  return (
                    <div key={i} className="rounded-md py-1.5 text-center"
                      style={{ background: isToday ? 'var(--color-amber)' : isActive ? 'var(--color-amber-bg)' : 'var(--color-surface)' }}>
                      <div className="text-[9px] font-semibold mb-1"
                        style={{ color: isToday ? '#000' : isActive ? 'var(--color-amber)' : 'var(--color-ink-subtle)' }}>{d}</div>
                      <div className="w-1.5 h-1.5 rounded-full mx-auto"
                        style={{ background: isToday ? 'rgba(0,0,0,0.4)' : isActive ? 'var(--color-amber)' : 'var(--color-hover)' }} />
                    </div>
                  )
                })}
              </div>
              {streak > 0 && (
                <div className="bg-amber-bg dark:bg-amber-bg-dark rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold text-amber">
                  ⚡ Bonus ×1.5 XP actif aujourd'hui
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">Badges</h2>
              <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
              <span className="text-xs text-ink-subtle">{unlockedSlugs.size} / {ALL_BADGES.length}</span>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {ALL_BADGES.map(b => {
                const unlocked = unlockedSlugs.has(b.slug)
                return (
                  <div key={b.slug}
                    className={`rounded-[var(--radius-md)] p-3.5 text-center shadow-card ${unlocked ? RARITY_BG[b.rarity] : 'bg-card dark:bg-card-dark'}`}
                    style={{ opacity: unlocked ? 1 : 0.38 }}>
                    <div className="text-3xl mb-2">{b.emoji}</div>
                    <p className={`font-serif text-xs font-black mb-0.5 ${unlocked ? RARITY_TEXT[b.rarity] : 'text-ink dark:text-ink-dark'}`}>{b.name}</p>
                    <p className="text-[10px] text-ink-subtle leading-tight">{b.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activité récente */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">Activité <em className="italic text-amber">récente</em></h2>
              <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
            </div>
            {library.length === 0 ? (
              <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic">Aucune activité pour l'instant</p>
            ) : (
              <div className="flex flex-col gap-2">
                {library.map((item: any) => (
                  <Link key={item.id} href={`/library/${item.id}`}
                    className="flex items-center gap-3 bg-card dark:bg-card-dark rounded-[var(--radius-sm)] px-4 py-3 shadow-card hover:bg-hover dark:hover:bg-hover-dark transition-colors">
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
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden xl:flex w-72 flex-shrink-0 border-l border-surface dark:border-surface-dark overflow-y-auto flex-col gap-4 p-5 bg-side dark:bg-side-dark">

        {profile?.favorite_genres?.length > 0 && (
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
            <h3 className="font-serif text-sm font-black mb-3 text-ink dark:text-ink-dark">Genres <em className="italic text-amber">favoris</em></h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.favorite_genres.map((g: string) => (
                <span key={g} className="text-[10px] font-semibold bg-amber-bg dark:bg-amber-bg-dark text-amber px-2.5 py-1 rounded-full">{g}</span>
              ))}
            </div>
          </div>
        )}

        {/* Connexions gaming — Steam intelligent */}
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
          <h3 className="font-serif text-sm font-black mb-1 text-ink dark:text-ink-dark">Connexions <em className="italic text-amber">gaming</em></h3>
          <p className="text-[10px] text-ink-subtle mb-3 font-serif italic">Connecte tes comptes pour la sync automatique</p>

          {/* Steam */}
          <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--color-surface)' }}>
            <span className="text-lg">🎮</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-ink dark:text-ink-dark">Steam</span>
              {steamId && <p className="text-[10px] text-ink-subtle mt-0.5 truncate">ID : {steamId}</p>}
            </div>
            {steamId ? (
              /* Déjà lié → sync direct sans demander l'ID */
              <a href={`/steam?autoSync=${steamId}`}
                className="text-[10px] font-bold text-amber bg-amber-bg dark:bg-amber-bg-dark px-2.5 py-1 rounded-full hover:bg-amber hover:text-black transition-colors flex-shrink-0">
                ↻ Sync
              </a>
            ) : (
              <a href="/steam"
                className="text-[10px] font-bold text-amber bg-amber-bg dark:bg-amber-bg-dark px-2.5 py-1 rounded-full hover:bg-amber hover:text-black transition-colors flex-shrink-0">
                Connecter
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--color-surface)' }}>
            <span className="text-lg">🟢</span>
            <span className="text-sm font-semibold text-ink dark:text-ink-dark flex-1">Xbox</span>
            <span className="text-[10px] font-semibold text-ink-subtle bg-surface dark:bg-surface-dark px-2 py-0.5 rounded-full">Bientôt</span>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <span className="text-lg">⚡</span>
            <span className="text-sm font-semibold text-ink dark:text-ink-dark flex-1">Epic Games</span>
            <span className="text-[10px] font-semibold text-ink-subtle bg-surface dark:bg-surface-dark px-2 py-0.5 rounded-full">Bientôt</span>
          </div>
        </div>

        {/* Déconnexion */}
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-ink-muted dark:text-ink-subtle hover:bg-crimson-bg hover:text-crimson transition-colors">
            → Se déconnecter
          </button>
        </div>
      </div>

      {/* ═══ EDIT PROFILE MODAL ═══ */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowEdit(false)}>
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-xl)] p-6 w-full max-w-md shadow-modal"
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-xl font-black mb-5 text-ink dark:text-ink-dark">
              Modifier mon <em className="italic text-amber">profil</em>
            </h2>

            <div className="flex flex-col gap-4">
              {/* Pseudo */}
              <div>
                <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-1.5 block">Pseudo</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                  maxLength={24} placeholder="Ton pseudo"
                  className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber/30 placeholder:text-ink-subtle"/>
              </div>

              {/* Bio */}
              <div>
                <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-1.5 block">Bio</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)}
                  maxLength={120} rows={2} placeholder="Parle de toi en quelques mots…"
                  className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-amber/30 placeholder:text-ink-subtle"/>
                <p className="text-[10px] text-ink-subtle text-right mt-1">{editBio.length}/120</p>
              </div>

              {/* Couleur avatar */}
              <div>
                <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 block">Couleur de l'avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(c => (
                    <button key={c.key} onClick={() => setEditColor(c.key)}
                      className={`w-9 h-9 rounded-full ${c.bg} transition-all`}
                      style={{ outline: editColor === c.key ? '3px solid var(--color-amber)' : '3px solid transparent', outlineOffset: '2px' }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {savedMsg && (
              <div className="mt-4 bg-forest-bg text-forest text-sm font-semibold px-3 py-2 rounded-[var(--radius-sm)] text-center">{savedMsg}</div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowEdit(false)}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-surface dark:bg-surface-dark text-ink-muted hover:bg-hover transition-colors">
                Annuler
              </button>
              <button onClick={saveProfile} disabled={saving || !editUsername.trim()}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-amber text-black hover:opacity-90 disabled:opacity-50 transition-all">
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}