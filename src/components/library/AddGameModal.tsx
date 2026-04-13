'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/components/SettingsProvider'
import { Search, X, Star, Check, ChevronRight } from 'lucide-react'

interface Props {
  userId: string
  onClose: () => void
  onAdded: () => void
}

interface SearchResult {
  igdbId: number
  existingId: string | null
  name: string
  slug: string
  coverUrl: string | null
  genres: string[]
  platforms: string[]
  released: string | null
  metacritic: number | null
}

const STATUSES = [
  { value: 'backlog',   label: 'À faire',  emoji: '🕐', color: '#f59e0b' },
  { value: 'playing',  label: 'En cours',  emoji: '▶',  color: '#3b82f6' },
  { value: 'completed',label: 'Terminé',   emoji: '✓',  color: '#22c55e' },
  { value: 'dropped',  label: 'Abandonné', emoji: '✕',  color: '#ef4444' },
]

const RATING_LABELS: Record<string, string> = {
  '0': '', '0.5': 'Nul', '1': 'Bof', '1.5': 'Moyen', '2': 'Passable',
  '2.5': 'Bien', '3': 'Bon', '3.5': 'Très bon', '4': 'Excellent',
  '4.5': 'Exceptionnel', '5': "Chef-d'œuvre",
}

export default function AddGameModal({ userId, onClose, onAdded }: Props) {
  const [step,      setStep]      = useState<'search' | 'details'>('search')
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<SearchResult[]>([])
  const [selected,  setSelected]  = useState<SearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const { settings } = useSettings()
  const [status,    setStatus]    = useState('backlog')
  const [rating,    setRating]    = useState(0)
  const [hover,     setHover]     = useState(0)
  const [review,    setReview]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    if (timeout.current) clearTimeout(timeout.current)
    setSearching(true)
    timeout.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } finally { setSearching(false) }
    }, 350)
    return () => { if (timeout.current) clearTimeout(timeout.current) }
  }, [query])

  function selectGame(game: SearchResult) {
    setSelected(game)
    setStep('details')
  }

  async function handleSubmit() {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      // 1. Upsert game
      let gameId: string
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('igdb_id', selected.igdbId)
        .maybeSingle()

      if (existing?.id) {
        gameId = existing.id
        if (selected.platforms?.length)
          await supabase.from('games').update({ platforms: selected.platforms }).eq('id', gameId)
      } else if (selected.existingId) {
        gameId = selected.existingId
      } else {
        const { data: newGame, error: gameError } = await supabase
          .from('games')
          .insert({
            igdb_id:     selected.igdbId,
            name:        selected.name,
            slug:        selected.slug,
            cover_url:   selected.coverUrl,
            genres:      selected.genres,
            platforms:   selected.platforms ?? [],
            released_at: selected.released,
            metacritic:  selected.metacritic,
          })
          .select('id').single()
        if (gameError || !newGame) throw new Error("Erreur lors de l'ajout du jeu")
        gameId = newGame.id
      }

      // 2. Add to library
      const { error: libError } = await supabase.from('library').upsert({
        user_id: userId,
        game_id: gameId,
        status,
        platform: settings.defaultPlatform || null,
        rating:  rating > 0 ? rating : null,
        review:  review.trim() || null,
      }, { onConflict: 'user_id,game_id' })
      if (libError) throw new Error('Ce jeu est déjà dans ta bibliothèque')

      await supabase.from('xp_transactions').insert({ user_id: userId, amount: 10, reason: 'game_added' })
      onAdded()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const displayRating = hover || rating
  const ratingLabel = RATING_LABELS[String(Math.round(displayRating * 2) / 2)] ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="bg-card dark:bg-card-dark w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {step === 'details' && (
              <button onClick={() => { setStep('search'); setSelected(null) }}
                className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-ink-subtle hover:text-ink dark:hover:text-ink-dark transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <div>
              <h2 className="font-bold text-lg text-ink dark:text-ink-dark">
                {step === 'search' ? 'Ajouter un jeu' : selected?.name}
              </h2>
              <p className="text-xs text-ink-subtle">
                {step === 'search' ? '+10 XP par ajout' : selected?.genres.slice(0, 2).join(' · ')}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-ink-subtle hover:text-ink dark:hover:text-ink-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP 1 : Search ── */}
        {step === 'search' && (
          <div className="px-5 pb-5 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              {searching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un jeu…"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface dark:bg-surface-dark text-sm text-ink dark:text-ink-dark placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-surface dark:border-surface-dark divide-y divide-surface dark:divide-surface-dark max-h-64 overflow-y-auto">
                {results.map(g => (
                  <button key={g.igdbId} onClick={() => selectGame(g)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface dark:hover:bg-surface-dark transition-colors text-left group">
                    <div className="w-10 flex-shrink-0" style={{ height: '56px' }}>
                      <div className="w-10 h-full rounded-lg overflow-hidden bg-surface dark:bg-surface-dark">
                        {g.coverUrl
                          ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover object-top" />
                          : <div className="w-full h-full flex items-center justify-center text-lg">🎮</div>
                        }
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-ink dark:text-ink-dark truncate group-hover:text-primary transition-colors">{g.name}</p>
                      <p className="text-xs text-ink-subtle">
                        {[g.released?.split('-')[0], g.genres[0], g.metacritic ? `${g.metacritic} MC` : null].filter(Boolean).join(' · ')}
                      </p>
                      {g.platforms?.length > 0 && (
                        <p className="text-[10px] text-ink-subtle/60 mt-0.5 truncate">
                          {g.platforms.slice(0, 4).join(', ')}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-subtle opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="text-center text-sm text-ink-subtle py-6">Aucun résultat pour "{query}"</p>
            )}

            {query.length === 0 && (
              <p className="text-center text-sm text-ink-subtle py-6">Tapez le nom d'un jeu pour le trouver</p>
            )}
          </div>
        )}

        {/* ── STEP 2 : Details ── */}
        {step === 'details' && selected && (
          <div className="px-5 pb-5 space-y-5">

            {/* Game preview */}
            <div className="flex gap-4 p-4 rounded-xl bg-surface dark:bg-surface-dark">
              <div className="w-16 h-22 rounded-lg overflow-hidden flex-shrink-0" style={{ height: '88px' }}>
                {selected.coverUrl
                  ? <img src={selected.coverUrl} alt={selected.name} className="w-full h-full object-cover object-top" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl bg-surface-dark">🎮</div>
                }
              </div>
              <div className="flex-1 min-w-0 py-1">
                <p className="font-bold text-ink dark:text-ink-dark line-clamp-2 leading-snug">{selected.name}</p>
                <p className="text-xs text-ink-subtle mt-1">{selected.released?.split('-')[0]}</p>
                {selected.platforms?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selected.platforms.slice(0, 5).map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-dark dark:bg-card text-ink-subtle">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">Statut</p>
              <div className="grid grid-cols-4 gap-2">
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                      status !== s.value ? 'opacity-60 hover:opacity-100' : ''
                    }`}
                    style={{
                      background: status === s.value ? `${s.color}20` : 'var(--color-surface)',
                      color: s.color,
                      outline: status === s.value ? `2px solid ${s.color}` : 'none',
                      outlineOffset: '2px',
                    }}>
                    <span className="text-base">{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rating stars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Note</p>
                {displayRating > 0 && (
                  <span className="text-xs text-primary font-semibold">{displayRating.toFixed(1)}/5 · {ratingLabel}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="flex-1 transition-transform hover:scale-110">
                    <Star className={`w-full h-8 transition-colors ${n <= displayRating ? 'text-primary fill-primary' : 'text-surface dark:text-surface-dark fill-surface dark:fill-surface-dark'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Review */}
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
                Avis <span className="normal-case font-normal">(optionnel)</span>
              </p>
              <textarea value={review} onChange={e => setReview(e.target.value)}
                placeholder="Ton avis en quelques mots…" rows={2} maxLength={500}
                className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder:text-ink-subtle focus:ring-2 focus:ring-primary/40" />
            </div>

            {error && <p className="text-red-500 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="px-4 py-3 rounded-xl text-sm font-semibold bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark transition-colors">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Check className="w-4 h-4" /> Ajouter · +10 XP</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}