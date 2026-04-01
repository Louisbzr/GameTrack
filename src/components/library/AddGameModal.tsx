'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  onClose: () => void
  onAdded: () => void
}

interface SearchResult {
  rawgId: number
  name: string
  slug: string
  coverUrl: string | null
  genres: string[]
  released: string | null
  metacritic: number | null
}

const STATUSES = [
  { value: 'backlog',   label: '🕐 À commencer' },
  { value: 'playing',   label: '▶ En cours' },
  { value: 'completed', label: '✓ Terminé' },
  { value: 'dropped',   label: '✕ Abandonné' },
]

const RATING_LABELS = ['', 'Nul', 'Bof', 'Bien', 'Super', "Chef-d'œuvre"]

export default function AddGameModal({ userId, onClose, onAdded }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [searching,setSearching]= useState(false)
  const [status,   setStatus]   = useState('backlog')
  const [rating,   setRating]   = useState(0)
  const [review,   setReview]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    if (timeout.current) clearTimeout(timeout.current)
    setSearching(true)
    timeout.current = setTimeout(async () => {
      const res  = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
      setSearching(false)
    }, 400)
    return () => { if (timeout.current) clearTimeout(timeout.current) }
  }, [query])

  function selectGame(game: SearchResult) {
    setSelected(game)
    setQuery(game.name)
    setResults([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected && !query.trim()) return
    setLoading(true)
    setError('')

    let gameId: string

    if (selected) {
      const { data: existing } = await supabase
        .from('games').select('id').eq('rawg_id', selected.rawgId).single()

      if (existing) {
        gameId = existing.id
      } else {
        const { data: newGame, error: gameError } = await supabase
          .from('games')
          .insert({
            rawg_id:    selected.rawgId,
            name:       selected.name,
            slug:       selected.slug,
            cover_url:  selected.coverUrl,
            genres:     selected.genres,
            released_at:selected.released,
            metacritic: selected.metacritic,
          })
          .select('id').single()

        if (gameError || !newGame) { setError("Erreur lors de l'ajout"); setLoading(false); return }
        gameId = newGame.id
      }
    } else {
      const { data: newGame, error: gameError } = await supabase
        .from('games').insert({ name: query.trim(), genres: [] }).select('id').single()

      if (gameError || !newGame) { setError("Erreur lors de l'ajout"); setLoading(false); return }
      gameId = newGame.id
    }

    const { error: libError } = await supabase.from('library').insert({
      user_id: userId,
      game_id: gameId,
      status,
      rating: rating || null,
      review: review.trim() || null,
    })

    if (libError) { setError('Ce jeu est déjà dans ta bibliothèque'); setLoading(false); return }

    await supabase.from('xp_transactions').insert({ user_id: userId, amount: 10, reason: 'game_added' })
    onAdded()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-card dark:bg-card-dark w-full sm:max-w-lg rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-lg)] shadow-modal"
        style={{ overflow: 'visible' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface dark:border-surface-dark">
          <div>
            <h2 className="font-serif text-xl font-black tracking-tight text-ink dark:text-ink-dark">
              Ajouter un <em className="italic text-amber">jeu</em>
            </h2>
            <p className="text-[11px] text-ink-subtle mt-0.5 font-serif italic">
              Propulsé par RAWG.io · +10 XP par ajout
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-ink-muted hover:bg-ink dark:hover:bg-surface hover:text-paper transition-colors text-sm flex-shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4" style={{ overflow: 'visible' }}>

          {/* Search input */}
          <div>
            <label className="text-[10px] font-semibold text-ink-muted dark:text-ink-subtle uppercase tracking-widest mb-2 block">
              Rechercher un jeu
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                placeholder="ex. Elden Ring, Hollow Knight…"
                className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none transition-all placeholder:text-ink-subtle"
                style={{ boxShadow: query ? '0 0 0 2px var(--color-amber)' : undefined }}
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin" />
              )}

              {/* Dropdown results */}
              {results.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 bg-card dark:bg-card-dark rounded-[var(--radius-md)] shadow-modal overflow-hidden"
                  style={{ zIndex: 9999, maxHeight: '280px', overflowY: 'auto' }}
                >
                  {results.map((g, i) => (
                    <button
                      key={g.rawgId}
                      type="button"
                      onClick={() => selectGame(g)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface dark:hover:bg-surface-dark transition-colors text-left"
                      style={{ borderTop: i > 0 ? '1px solid var(--color-surface)' : undefined }}
                    >
                      <div className="w-12 h-8 rounded-[6px] overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                        {g.coverUrl
                          ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-base">🎮</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-bold truncate text-ink dark:text-ink-dark">{g.name}</p>
                        <p className="text-[11px] text-ink-subtle">
                          {[g.genres[0], g.released?.split('-')[0], g.metacritic ? `${g.metacritic} MC` : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected preview */}
          {selected && (
            <div className="flex items-center gap-3 bg-amber-bg dark:bg-amber-bg-dark rounded-[var(--radius-sm)] p-3">
              <div className="w-14 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                {selected.coverUrl
                  ? <img src={selected.coverUrl} alt={selected.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-lg">🎮</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm font-black text-amber truncate">{selected.name}</p>
                <p className="text-[11px] text-amber/70">{selected.genres.slice(0, 2).join(', ')}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelected(null); setQuery('') }}
                className="w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center text-amber text-xs hover:bg-amber hover:text-paper dark:hover:text-black transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* Status selector */}
          <div>
            <label className="text-[10px] font-semibold text-ink-muted dark:text-ink-subtle uppercase tracking-widest mb-2 block">
              Statut
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className="py-2.5 px-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all text-center leading-tight"
                  style={{
                    background: status === s.value ? 'var(--color-amber-bg)'  : 'var(--color-surface)',
                    color:      status === s.value ? 'var(--color-amber)'     : 'var(--color-ink-muted)',
                    border:     status === s.value ? '1px solid var(--color-amber-mid)' : '1px solid transparent',
                    fontWeight: status === s.value ? 700 : 500,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Star rating */}
          <div>
            <label className="text-[10px] font-semibold text-ink-muted dark:text-ink-subtle uppercase tracking-widest mb-2 block">
              Note
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(rating === i ? 0 : i)}
                  className="text-3xl leading-none transition-all hover:scale-110 active:scale-95"
                  style={{ color: i <= rating ? 'var(--color-amber)' : 'var(--color-surface)' }}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <span className="text-xs text-ink-subtle ml-1 font-serif italic">
                  {RATING_LABELS[rating]}
                </span>
              )}
            </div>
          </div>

          {/* Review textarea */}
          <div>
            <label className="text-[10px] font-semibold text-ink-muted dark:text-ink-subtle uppercase tracking-widest mb-2 block">
              Mini-review <span className="normal-case font-normal text-ink-subtle">(optionnel)</span>
            </label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Ton avis en quelques mots…"
              rows={2}
              maxLength={500}
              className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none resize-none transition-all placeholder:text-ink-subtle font-serif"
              style={{ boxShadow: review ? '0 0 0 2px var(--color-amber)' : undefined }}
            />
            {review && (
              <p className="text-[10px] text-ink-subtle text-right mt-1">{review.length}/500</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-crimson text-xs bg-crimson-bg px-3 py-2 rounded-[var(--radius-sm)]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-[var(--radius-sm)] text-sm font-semibold bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || (!selected && !query.trim())}
              className="py-3 px-6 rounded-[var(--radius-sm)] text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                flex: 2,
                background: loading ? 'var(--color-surface)' : 'var(--color-ink)',
                color:      loading ? 'var(--color-ink-muted)' : 'var(--color-paper)',
              }}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Ajout en cours…
                </>
              ) : (
                'Ajouter · +10 XP ✦'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}