'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import GameCard from '@/components/library/GameCard'
import AddGameModal from '@/components/library/AddGameModal'

const STATUS_FILTERS = [
  { label: 'Tous',       value: '' },
  { label: 'En cours',   value: 'playing' },
  { label: 'Terminés',   value: 'completed' },
  { label: 'À faire',    value: 'backlog' },
  { label: 'Abandonnés', value: 'dropped' },
]

const PLATFORM_SHORT: Record<string, string> = {
  'PlayStation 5': 'PS5','PlayStation 4': 'PS4','PlayStation 3': 'PS3',
  'Xbox One': 'XBO','Xbox Series S/X': 'XSX','Xbox 360': 'X360',
  'Nintendo Switch': 'NSW','PC': 'PC','iOS': 'iOS','Android': 'AND',
  'Wii': 'Wii','macOS': 'Mac','Linux': 'Linux',
}

interface LibraryItem {
  id: string
  status: string
  rating: number | null
  review: string | null
  games: {
    id: string
    name: string
    genres: string[] | null
    cover_url: string | null
    platforms: string[] | null
    released_at: string | null
  }
}

interface Props {
  userId: string
  library: LibraryItem[]
  stats: { total: number; completed: number; playing: number; avgRating: string }
  openAdd: boolean
  xp?: number
  level?: number
  streak?: number
}

export default function LibraryClient({ userId, library, stats, openAdd, xp = 0, level = 1, streak = 0 }: Props) {
  const [showModal,     setShowModal]     = useState(openAdd)
  const [activeStatus,  setActiveStatus]  = useState('')
  const [activeGenre,   setActiveGenre]   = useState('')
  const [activePlat,    setActivePlat]    = useState('')
  const [activeRating,  setActiveRating]  = useState(0)   // 0 = tous
  const [sort,          setSort]          = useState('recent')
  const router = useRouter()

  function handleAdded() { router.refresh() }

  const xpNeeded  = level * 200
  const xpCurrent = xp % xpNeeded
  const xpPercent = Math.round((xpCurrent / xpNeeded) * 100)

  // Genres dynamiques — extraits de la bibliothèque
  const genres = useMemo(() => {
    const set = new Set<string>()
    library.forEach(l => l.games?.genres?.forEach(g => set.add(g)))
    return Array.from(set).sort()
  }, [library])

  // Plateformes dynamiques
  const platforms = useMemo(() => {
    const set = new Set<string>()
    library.forEach(l => l.games?.platforms?.forEach(p => {
      const short = PLATFORM_SHORT[p]
      if (short) set.add(short)
    }))
    return Array.from(set).sort()
  }, [library])

  // Filtrage
  const filtered = useMemo(() => {
    let items = [...library]
    if (activeStatus)  items = items.filter(l => l.status === activeStatus)
    if (activeGenre)   items = items.filter(l => l.games?.genres?.includes(activeGenre))
    if (activePlat)    items = items.filter(l =>
      l.games?.platforms?.some(p => PLATFORM_SHORT[p] === activePlat)
    )
    if (activeRating)  items = items.filter(l => (l.rating ?? 0) >= activeRating)
    if (sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (sort === 'alpha') items.sort((a, b) => (a.games?.name || '').localeCompare(b.games?.name || ''))
    return items
  }, [library, activeStatus, activeGenre, activePlat, activeRating, sort])

  const hasActiveFilter = activeStatus || activeGenre || activePlat || activeRating > 0

  const quests = [
    { icon: '📝', label: 'Écrire une review',      xp: '+50', done: false },
    { icon: '⭐', label: 'Noter 3 jeux',            xp: '+75', done: false },
    { icon: '🏆', label: 'Marquer un jeu terminé', xp: '+30', done: false },
    { icon: '📚', label: 'Ajouter un jeu',          xp: '+10', done: stats.total > 0 },
  ]

  return (
    <div className="flex h-full">

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 lg:p-7">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-1">Bibliothèque</p>
              <h1 className="font-serif text-2xl lg:text-3xl font-black tracking-tight leading-none text-ink dark:text-ink-dark">
                Mes <em className="italic text-amber">jeux</em>
              </h1>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="hidden lg:flex items-center gap-2 bg-ink dark:bg-card-dark text-paper dark:text-ink-dark px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold hover:bg-amber hover:text-black transition-colors flex-shrink-0 shadow-card"
            >
              + Ajouter
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2.5 mb-5">
            {[
              { n: stats.total,     l: 'Total',    c: 'text-cobalt' },
              { n: stats.completed, l: 'Terminés', c: 'text-forest' },
              { n: stats.playing,   l: 'En cours', c: 'text-amber' },
              { n: stats.avgRating, l: 'Moyenne',  c: 'text-crimson' },
            ].map(s => (
              <div key={s.l} className="bg-card dark:bg-card-dark rounded-[var(--radius-sm)] p-3.5 shadow-card relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-hover transition-all">
                <div className={`font-serif text-2xl lg:text-3xl font-black mb-0.5 ${s.c}`}>{s.n}</div>
                <div className="text-[9px] font-semibold text-ink-subtle uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>

          {/* ── FILTRES ── */}
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] shadow-card mb-5 overflow-hidden">

            {/* Ligne 1 : status + sort */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface dark:border-surface-dark">
              <div className="flex items-center gap-1 bg-surface dark:bg-surface-dark rounded-[var(--radius-sm)] p-1">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setActiveStatus(f.value)}
                    className="px-3 py-1.5 rounded-[6px] text-[12px] font-semibold whitespace-nowrap transition-all"
                    style={{
                      background: activeStatus === f.value ? 'var(--color-ink)' : 'transparent',
                      color:      activeStatus === f.value ? 'var(--color-paper)' : 'var(--color-ink-subtle)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle text-[12px] font-medium px-3 py-2 rounded-[var(--radius-sm)] outline-none cursor-pointer appearance-none"
              >
                <option value="recent">Récents</option>
                <option value="rating">Mieux notés</option>
                <option value="alpha">A → Z</option>
              </select>
            </div>

            {/* Ligne 2 : genres dynamiques */}
            {genres.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface dark:border-surface-dark overflow-x-auto">
                <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider flex-shrink-0">Genre</span>
                <div className="flex gap-1.5 flex-nowrap">
                  {genres.map(g => (
                    <button
                      key={g}
                      onClick={() => setActiveGenre(activeGenre === g ? '' : g)}
                      className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                      style={{
                        background: activeGenre === g ? 'var(--color-amber-bg)' : 'var(--color-surface)',
                        color:      activeGenre === g ? 'var(--color-amber)'    : 'var(--color-ink-subtle)',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ligne 3 : plateformes + note */}
            <div className="flex items-center gap-4 px-4 py-2.5 flex-wrap">
              {/* Plateformes */}
              {platforms.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider flex-shrink-0">Console</span>
                  {platforms.map(p => (
                    <button
                      key={p}
                      onClick={() => setActivePlat(activePlat === p ? '' : p)}
                      className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold font-mono whitespace-nowrap transition-all"
                      style={{
                        background: activePlat === p ? 'var(--color-cobalt-bg)' : 'var(--color-surface)',
                        color:      activePlat === p ? 'var(--color-cobalt)'    : 'var(--color-ink-subtle)',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Séparateur vertical */}
              {platforms.length > 0 && (
                <div className="h-5 w-px bg-surface dark:bg-surface-dark flex-shrink-0" />
              )}

              {/* Note minimum */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider flex-shrink-0">Note</span>
                {[0,1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setActiveRating(activeRating === n ? 0 : n)}
                    className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold transition-all"
                    style={{
                      background: activeRating === n && n > 0 ? 'var(--color-amber-bg)' : 'var(--color-surface)',
                      color:      activeRating === n && n > 0 ? 'var(--color-amber)'    : 'var(--color-ink-subtle)',
                    }}
                  >
                    {n === 0 ? 'Toutes' : <>{'★'.repeat(n)}{n < 5 ? '+' : ''}</>}
                  </button>
                ))}
              </div>

              {/* Reset */}
              {hasActiveFilter && (
                <button
                  onClick={() => { setActiveStatus(''); setActiveGenre(''); setActivePlat(''); setActiveRating(0) }}
                  className="ml-auto text-[11px] text-amber font-semibold hover:underline flex-shrink-0"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Section label */}
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-serif text-sm font-bold text-ink dark:text-ink-dark">
              {activeStatus ? STATUS_FILTERS.find(f => f.value === activeStatus)?.label : 'Tous les'}{' '}
              <em className="italic text-amber">jeux</em>
            </h2>
            <span className="text-[10px] font-mono text-ink-subtle bg-surface dark:bg-surface-dark px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
            {activeGenre && (
              <span className="text-[10px] font-semibold text-amber bg-amber-bg dark:bg-amber-bg-dark px-2 py-0.5 rounded-full">
                {activeGenre}
              </span>
            )}
            {activePlat && (
              <span className="text-[10px] font-semibold text-cobalt bg-cobalt-bg px-2 py-0.5 rounded-full font-mono">
                {activePlat}
              </span>
            )}
            {activeRating > 0 && (
              <span className="text-[10px] font-semibold text-amber bg-amber-bg dark:bg-amber-bg-dark px-2 py-0.5 rounded-full">
                {'★'.repeat(activeRating)}+
              </span>
            )}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="font-serif text-lg font-black mb-2 text-ink dark:text-ink-dark">Aucun jeu</h3>
              <p className="text-ink-muted dark:text-ink-subtle text-sm mb-4">
                {hasActiveFilter ? 'Aucun jeu ne correspond à ces filtres' : 'Ajoute ton premier jeu'}
              </p>
              {hasActiveFilter ? (
                <button
                  onClick={() => { setActiveStatus(''); setActiveGenre(''); setActivePlat(''); setActiveRating(0) }}
                  className="text-amber font-semibold text-sm hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              ) : (
                <button onClick={() => setShowModal(true)}
                  className="bg-ink dark:bg-card-dark text-paper dark:text-ink-dark px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold hover:bg-amber hover:text-black transition-colors">
                  + Ajouter un jeu
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
              {filtered.map(item => (
                <GameCard
                  key={item.id}
                  id={item.id}
                  userId={userId}
                  gameId={item.games?.id}
                  name={item.games?.name || '?'}
                  genre={item.games?.genres?.[0]}
                  status={item.status as any}
                  rating={item.rating}
                  coverUrl={item.games?.cover_url}
                  review={item.review}
                  platforms={item.games?.platforms}
                  releasedAt={item.games?.released_at}
                />
              ))}
              <button
                onClick={() => setShowModal(true)}
                className="rounded-[var(--radius-sm)] border-2 border-dashed border-surface dark:border-surface-dark flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-amber hover:bg-amber-bg dark:hover:bg-amber-bg-dark group"
                style={{ aspectRatio: '3/3' }}
              >
                <div className="w-9 h-9 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-xl group-hover:bg-amber-bg dark:group-hover:bg-amber-bg-dark transition-colors text-ink-subtle group-hover:text-amber">+</div>
                <span className="text-[11px] font-medium text-ink-subtle group-hover:text-amber transition-colors text-center leading-tight">Ajouter<br/>un jeu</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden xl:flex w-64 flex-shrink-0 border-l border-surface dark:border-surface-dark overflow-y-auto flex-col gap-4 p-4 bg-side dark:bg-side-dark">
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-serif text-sm font-black text-ink dark:text-ink-dark">Niveau {level}</p>
              <p className="text-[10px] text-ink-subtle mt-0.5">{xpCurrent} / {xpNeeded} XP</p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-bg dark:bg-amber-bg-dark px-2.5 py-1.5 rounded-lg">
                <span className="text-sm">🔥</span>
                <span className="font-mono text-xs font-bold text-amber">{streak}j</span>
              </div>
            )}
          </div>
          <div className="h-1.5 bg-surface dark:bg-surface-dark rounded-full overflow-hidden">
            <div className="h-full bg-amber rounded-full transition-all duration-700" style={{ width: `${xpPercent}%` }} />
          </div>
          <p className="text-[10px] text-ink-subtle mt-1.5">{xpNeeded - xpCurrent} XP → Niveau {level + 1}</p>
        </div>
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm font-black text-ink dark:text-ink-dark">Quêtes du <em className="italic text-amber">jour</em></h3>
            <span className="text-[10px] font-bold text-amber bg-amber-bg dark:bg-amber-bg-dark px-2 py-0.5 rounded-full">+90 XP</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {quests.map(q => (
              <div key={q.label} className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 ${q.done ? 'bg-forest-bg dark:bg-forest-bg-dark' : 'bg-surface dark:bg-surface-dark'}`}>
                <span className="text-sm flex-shrink-0">{q.icon}</span>
                <span className={`text-xs font-medium flex-1 leading-tight ${q.done ? 'line-through text-forest opacity-60' : 'text-ink-muted dark:text-ink-subtle'}`}>{q.label}</span>
                <span className="font-mono text-[11px] font-bold text-amber flex-shrink-0">{q.xp}</span>
              </div>
            ))}
          </div>
        </div>
        {streak > 0 && (
          <div className="bg-amber-bg dark:bg-amber-bg-dark rounded-[var(--radius-md)] p-4 border border-amber/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="font-serif text-lg font-black text-amber leading-none">{streak} jours</p>
                <p className="text-[11px] text-amber/70 mt-0.5">Bonus ×1.5 XP actif</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && <AddGameModal userId={userId} onClose={() => setShowModal(false)} onAdded={handleAdded} />}
    </div>
  )
}