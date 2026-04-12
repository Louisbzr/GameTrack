'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, ChevronLeft, ChevronRight, X, Plus, Check, Star } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReleaseGame {
  igdb_id: number
  name: string
  cover_url: string | null
  released: string | null
  genres: string[]
  platforms: string[]
  metacritic: number | null
  rating_count: number
}

const STATUSES = [
  { value: 'backlog',   label: '🕐 À commencer' },
  { value: 'playing',  label: '▶ En cours'      },
  { value: 'completed',label: '✓ Terminé'       },
  { value: 'dropped',  label: '✕ Abandonné'     },
]

// Mapping IGDB → label court
const PLATFORM_LABEL: Record<string, string> = {
  'PC (Microsoft Windows)': 'PC',
  'PlayStation 5': 'PS5',
  'PlayStation 4': 'PS4',
  'PlayStation 3': 'PS3',
  'Xbox Series X|S': 'Xbox Series',
  'Xbox One': 'Xbox One',
  'Nintendo Switch': 'Switch',
  'Nintendo Switch 2': 'Switch 2',
  'iOS': 'iOS',
  'Android': 'Android',
  'Mac': 'Mac',
  'Linux': 'Linux',
}

function shortPlatform(p: string) {
  return PLATFORM_LABEL[p] ?? p
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function getWeekBounds(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    from: monday.toISOString().split('T')[0],
    to:   sunday.toISOString().split('T')[0],
  }
}

// ── Add-to-library modal ──────────────────────────────────────────────────────

function AddModal({
  game,
  userId,
  onClose,
  onAdded,
}: {
  game: ReleaseGame
  userId: string
  onClose: () => void
  onAdded: (gameDbId: string) => void
}) {
  const supabase = createClient()
  const [status,  setStatus]  = useState('backlog')
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleAdd() {
    setLoading(true)
    setError('')
    try {
      // 1. Upsert game dans la table games
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('igdb_id', game.igdb_id)
        .maybeSingle()

      let gameId: string
      if (existing?.id) {
        gameId = existing.id
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('games')
          .insert({
            igdb_id:    game.igdb_id,
            name:       game.name,
            cover_url:  game.cover_url,
            genres:     game.genres,
            platforms:  game.platforms,
            released_at: game.released,
            metacritic: game.metacritic,
          })
          .select('id')
          .single()
        if (insertErr || !inserted) throw new Error(insertErr?.message ?? 'Insert failed')
        gameId = inserted.id
      }

      // 2. Ajouter à la bibliothèque
      const { error: libErr } = await supabase
        .from('library')
        .upsert({ user_id: userId, game_id: gameId, status, rating: rating * 2 || null },
                 { onConflict: 'user_id,game_id' })
      if (libErr) throw new Error(libErr.message)

      onAdded(gameId)
    } catch (e: any) {
      setError(e.message ?? 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const displayRating = hover || rating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Cover + titre */}
        <div className="flex gap-4 p-5">
          <div className="w-24 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
            {game.cover_url
              ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover object-top" />
              : <div className="w-full h-full flex items-center justify-center text-3xl">🎮</div>
            }
          </div>
          <div className="flex-1 min-w-0 pt-1 space-y-1.5">
            <h2 className="font-bold text-ink dark:text-ink-dark leading-snug line-clamp-3">{game.name}</h2>
            {game.released && <p className="text-xs text-primary neon-text font-medium">{formatDate(game.released)}</p>}
            {game.genres?.[0] && <p className="text-xs text-ink-subtle">{game.genres.slice(0, 2).join(' · ')}</p>}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {game.platforms.slice(0, 3).map(p => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark text-ink-subtle">
                  {shortPlatform(p)}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="self-start text-ink-subtle hover:text-ink dark:hover:text-ink-dark">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Statut */}
          <div>
            <p className="text-xs text-ink-subtle mb-2">Statut</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => setStatus(s.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    status === s.value
                      ? 'bg-primary text-white'
                      : 'bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-xs text-ink-subtle mb-2">Note (optionnel)</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n}
                  onClick={() => setRating(rating === n ? 0 : n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="text-primary transition-transform hover:scale-110">
                  <Star className="w-6 h-6" fill={n <= displayRating ? 'currentColor' : 'none'} />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-xs text-ink-subtle">{rating}/5</span>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button onClick={handleAdd} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Plus className="w-4 h-4" /> Ajouter à ma bibliothèque</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ReleasesClient() {
  const supabase = createClient()

  const [weekOffset,    setWeekOffset]    = useState(0)
  const [games,         setGames]         = useState<ReleaseGame[]>([])
  const [loading,       setLoading]       = useState(true)
  const [weekRange,     setWeekRange]     = useState<{ from: string; to: string } | null>(null)
  const [selPlatforms,  setSelPlatforms]  = useState<string[]>([])
  const [selDay,        setSelDay]        = useState<string | null>(null)
  const [userId,        setUserId]        = useState<string | null>(null)
  const [addedIds,      setAddedIds]      = useState<Set<number>>(new Set())
  const [selectedGame,  setSelectedGame]  = useState<ReleaseGame | null>(null)

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  // Fetch releases
  useEffect(() => {
    setLoading(true)
    setGames([])
    setSelPlatforms([])
    setSelDay(null)

    const bounds = getWeekBounds(weekOffset)
    // Pour les semaines autres que la courante, on passe les dates en query param
    const url = weekOffset === 0
      ? '/api/games/releases'
      : `/api/games/releases?from=${bounds.from}&to=${bounds.to}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setGames(data.results ?? [])
        setWeekRange(data.from && data.to ? { from: data.from, to: data.to } : bounds)
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }, [weekOffset])

  // Toutes les plateformes disponibles
  const allPlatforms = useMemo(() => {
    const set = new Set<string>()
    games.forEach(g => g.platforms.forEach(p => set.add(shortPlatform(p))))
    return [...set].sort()
  }, [games])

  // Tous les jours disponibles
  const allDays = useMemo(() => {
    const set = new Set<string>()
    games.forEach(g => { if (g.released) set.add(g.released) })
    return [...set].sort()
  }, [games])

  // Jeux filtrés
  const filtered = useMemo(() => {
    return games.filter(g => {
      if (selPlatforms.length > 0) {
        const short = g.platforms.map(shortPlatform)
        if (!selPlatforms.some(p => short.includes(p))) return false
      }
      if (selDay && g.released !== selDay) return false
      return true
    })
  }, [games, selPlatforms, selDay])

  function togglePlatform(p: string) {
    setSelPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const weekLabel = weekOffset === 0
    ? 'Cette semaine'
    : weekOffset === -1 ? 'Semaine dernière'
    : weekOffset === 1  ? 'Semaine prochaine'
    : weekRange ? `${formatDate(weekRange.from)} – ${formatDate(weekRange.to)}` : ''

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-primary neon-text" />
              <h1 className="text-3xl font-bold text-ink dark:text-ink-dark">Sorties</h1>
            </div>
            <p className="text-sm text-ink-subtle">
              {weekRange ? `${formatDate(weekRange.from)} – ${formatDate(weekRange.to)}` : ''}
              {!loading && games.length > 0 && (
                <span className="ml-2 text-primary neon-text font-medium">{games.length} jeu{games.length > 1 ? 'x' : ''}</span>
              )}
            </p>
          </div>

          {/* Navigation semaine */}
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="p-2 rounded-lg glass hover:border-primary/50 transition-colors text-ink-subtle hover:text-ink dark:hover:text-ink-dark">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-ink dark:text-ink-dark min-w-[130px] text-center">
              {weekLabel}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="p-2 rounded-lg glass hover:border-primary/50 transition-colors text-ink-subtle hover:text-ink dark:hover:text-ink-dark">
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)}
                className="text-xs text-primary neon-text hover:underline ml-1">
                Aujourd'hui
              </button>
            )}
          </div>
        </div>

        {/* ── Filtres ── */}
        {!loading && games.length > 0 && (
          <div className="space-y-3">
            {/* Plateformes */}
            {allPlatforms.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-ink-subtle mr-1">Console :</span>
                {allPlatforms.map(p => (
                  <button key={p} onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selPlatforms.includes(p)
                        ? 'bg-primary text-white'
                        : 'glass text-ink-muted dark:text-ink-subtle hover:border-primary/50'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Jours */}
            {allDays.length > 1 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-ink-subtle mr-1">Jour :</span>
                {allDays.map(d => (
                  <button key={d} onClick={() => setSelDay(selDay === d ? null : d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selDay === d
                        ? 'bg-primary text-white'
                        : 'glass text-ink-muted dark:text-ink-subtle hover:border-primary/50'
                    }`}>
                    {formatDate(d)}
                  </button>
                ))}
              </div>
            )}

            {/* Reset */}
            {(selPlatforms.length > 0 || selDay) && (
              <button onClick={() => { setSelPlatforms([]); setSelDay(null) }}
                className="flex items-center gap-1 text-xs text-ink-subtle hover:text-primary transition-colors">
                <X className="w-3 h-3" /> Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* ── Grille ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="glass rounded-lg p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-28 rounded-md bg-surface dark:bg-surface-dark flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-surface dark:bg-surface-dark rounded w-3/4" />
                  <div className="h-3 bg-surface dark:bg-surface-dark rounded w-1/2" />
                  <div className="h-3 bg-surface dark:bg-surface-dark rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <p className="text-ink-subtle">Aucune sortie pour ces critères.</p>
            {(selPlatforms.length > 0 || selDay) && (
              <button onClick={() => { setSelPlatforms([]); setSelDay(null) }}
                className="mt-3 text-sm text-primary neon-text hover:underline">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(g => {
              const isAdded = addedIds.has(g.igdb_id)
              const platforms = g.platforms.map(shortPlatform).slice(0, 4)
              return (
                <button key={g.igdb_id} onClick={() => !isAdded && setSelectedGame(g)}
                  className={`glass rounded-lg p-4 flex gap-4 group text-left transition-colors w-full ${
                    isAdded ? 'opacity-60 cursor-default' : 'hover:border-primary/50 cursor-pointer'
                  }`}>
                  <div className="w-20 h-28 rounded-md overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                    {g.cover_url
                      ? <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
                    }
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-ink dark:text-ink-dark group-hover:text-primary transition-colors line-clamp-2 leading-snug text-sm">
                        {g.name}
                      </h3>
                      {isAdded
                        ? <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        : <Plus className="w-4 h-4 text-ink-subtle flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </div>
                    {g.genres?.[0] && <p className="text-xs text-ink-subtle">{g.genres.slice(0, 2).join(', ')}</p>}
                    <div className="flex flex-wrap gap-1">
                      {platforms.map(p => (
                        <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-surface dark:bg-surface-dark text-ink-subtle">{p}</span>
                      ))}
                    </div>
                    {g.released && (
                      <p className="text-xs text-primary neon-text font-medium">{formatDate(g.released)}</p>
                    )}
                    {g.metacritic ? (
                      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        {g.metacritic} MC
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal ajout ── */}
      {selectedGame && userId && (
        <AddModal
          game={selectedGame}
          userId={userId}
          onClose={() => setSelectedGame(null)}
          onAdded={() => {
            setAddedIds(prev => new Set([...prev, selectedGame.igdb_id]))
            setSelectedGame(null)
          }}
        />
      )}
    </div>
  )
}