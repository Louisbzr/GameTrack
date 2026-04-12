'use client'

import { useState, useRef } from 'react'
import { Search, SlidersHorizontal, X, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  { value: 'backlog',   label: 'À faire',   color: '#f59e0b' },
  { value: 'playing',  label: 'En cours',   color: '#3b82f6' },
  { value: 'completed',label: 'Terminé',    color: '#22c55e' },
  { value: 'dropped',  label: 'Abandonné',  color: '#ef4444' },
]

interface Props {
  userId: string
  topGames: any[]
  recentGames: any[]
  myGenres: string[]
}

export default function DiscoverClient({ userId }: Props) {
  const supabase = createClient()

  const [search,       setSearch]       = useState('')
  const [results,      setResults]      = useState<SearchResult[]>([])
  const [searching,    setSearching]    = useState(false)
  const [focused,      setFocused]      = useState(false)

  // Quick-add panel
  const [selected,     setSelected]     = useState<SearchResult | null>(null)
  const [status,       setStatus]       = useState('backlog')
  const [adding,       setAdding]       = useState(false)
  const [addedIds,     setAddedIds]     = useState<Set<number>>(new Set())

  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSearch(q: string) {
    setSearch(q)
    setSelected(null)
    if (q.length < 2) { setResults([]); return }
    if (timeout.current) clearTimeout(timeout.current)
    setSearching(true)
    timeout.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } finally { setSearching(false) }
    }, 350)
  }

  async function handleAdd() {
    if (!selected || adding) return
    setAdding(true)
    try {
      let gameId: string
      const { data: existing } = await supabase
        .from('games').select('id').eq('igdb_id', selected.igdbId).maybeSingle()

      if (existing?.id) {
        gameId = existing.id
      } else if (selected.existingId) {
        gameId = selected.existingId
      } else {
        const { data: newGame } = await supabase.from('games').insert({
          igdb_id:     selected.igdbId,
          name:        selected.name,
          slug:        selected.slug,
          cover_url:   selected.coverUrl,
          genres:      selected.genres,
          platforms:   selected.platforms ?? [],
          released_at: selected.released,
          metacritic:  selected.metacritic,
        }).select('id').single()
        gameId = newGame!.id
      }

      await supabase.from('library').upsert(
        { user_id: userId, game_id: gameId, status },
        { onConflict: 'user_id,game_id' }
      )
      await supabase.from('xp_transactions').insert({ user_id: userId, amount: 10, reason: 'game_added' })
      setAddedIds(prev => new Set([...prev, selected.igdbId]))
      setSelected(null)
      setSearch('')
      setResults([])
    } finally { setAdding(false) }
  }

  const showDropdown = focused && search.length >= 2

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl space-y-4">

        <div>
          <h1 className="text-3xl font-bold text-ink dark:text-ink-dark mb-1">Ajouter un jeu</h1>
          <p className="text-sm text-ink-subtle">Recherchez un jeu et ajoutez-le directement à votre bibliothèque.</p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle z-10" />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin z-10" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Rechercher un jeu…"
            className="w-full pl-11 pr-11 py-4 rounded-xl glass text-ink dark:text-ink-dark placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />

          {/* Dropdown results */}
          {showDropdown && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl max-h-96 overflow-y-auto bg-background border border-border" style={{ zIndex: 9999 }}>
              {results.map(g => {
                const isAdded = addedIds.has(g.igdbId)
                return (
                  <button key={g.igdbId}
                    onMouseDown={e => { e.preventDefault(); setSelected(g); setResults([]); setFocused(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-surface/50 dark:border-surface-dark/50 last:border-0 ${
                      selected?.igdbId === g.igdbId
                        ? 'bg-primary/10'
                        : 'hover:bg-surface dark:hover:bg-surface-dark'
                    }`}>
                    <div className="w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                      {g.coverUrl
                        ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover object-top" />
                        : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-ink dark:text-ink-dark truncate">{g.name}</p>
                      <p className="text-xs text-ink-subtle">
                        {[g.released?.split('-')[0], g.genres[0]].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {isAdded
                      ? <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      : <Plus className="w-4 h-4 text-ink-subtle flex-shrink-0" />
                    }
                  </button>
                )
              })}
            </div>
          )}

          {showDropdown && !searching && results.length === 0 && !selected && (
            <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl p-6 text-center z-50">
              <p className="text-sm text-ink-subtle">Aucun résultat pour "{search}"</p>
            </div>
          )}
        </div>

        {/* Quick-add panel */}
        {selected && (
          <div className="glass rounded-xl overflow-hidden">
            {/* Game info */}
            <div className="flex gap-4 p-4 border-b border-surface/50 dark:border-surface-dark/50">
              <div className="w-14 rounded-lg overflow-hidden flex-shrink-0" style={{ height: '74px' }}>
                {selected.coverUrl
                  ? <img src={selected.coverUrl} alt={selected.name} className="w-full h-full object-cover object-top" />
                  : <div className="w-full h-full bg-surface dark:bg-surface-dark flex items-center justify-center text-xl">🎮</div>
                }
              </div>
              <div className="flex-1 min-w-0 py-1">
                <p className="font-bold text-ink dark:text-ink-dark line-clamp-1">{selected.name}</p>
                <p className="text-xs text-ink-subtle mt-0.5">
                  {[selected.released?.split('-')[0], selected.genres[0]].filter(Boolean).join(' · ')}
                </p>
                {selected.platforms?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selected.platforms.slice(0, 4).map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark text-ink-subtle">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="self-start text-ink-subtle hover:text-ink dark:hover:text-ink-dark p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status + Add */}
            <div className="p-4 flex items-center gap-3 flex-wrap">
              <p className="text-xs text-ink-subtle font-medium">Statut :</p>
              <div className="flex gap-2 flex-1">
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: status === s.value ? `${s.color}20` : 'var(--color-surface)',
                      color: status === s.value ? s.color : 'var(--color-ink-muted)',
                      outline: status === s.value ? `1.5px solid ${s.color}` : 'none',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button onClick={handleAdd} disabled={adding}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 flex-shrink-0">
                {adding
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Plus className="w-4 h-4" /> Ajouter · +10 XP</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}