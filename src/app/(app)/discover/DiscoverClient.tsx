'use client'

import { useState, useRef } from 'react'

interface Props {
  userId: string
  topGames: any[]
  recentGames: any[]
  myGenres: string[]
}

const ALL_GENRES = ['Tous', 'RPG', 'Action', 'Aventure', 'Roguelite', 'Platformer', 'Indé', 'Puzzle', 'Racing', 'Sports']

function getUniqueGames(items: any[]) {
  const seen = new Set()
  return items.filter(item => {
    const game = item.games
    if (!game || seen.has(game.id)) return false
    seen.add(game.id)
    return true
  })
}

function avgRating(items: any[], gameId: string) {
  const rated = items.filter(i => i.games?.id === gameId && i.rating)
  if (!rated.length) return null
  return (rated.reduce((a: number, i: any) => a + i.rating, 0) / rated.length).toFixed(1)
}

export default function DiscoverClient({ userId, topGames, recentGames, myGenres }: Props) {
  const [activeGenre,   setActiveGenre]   = useState('Tous')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching,     setSearching]     = useState(false)
  const [addedGames,    setAddedGames]    = useState<Set<number>>(new Set())
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    if (timeout.current) clearTimeout(timeout.current)
    setSearching(true)
    timeout.current = setTimeout(async () => {
      const res  = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 350)
  }

  function clearSearch() {
    setSearchQuery('')
    setSearchResults([])
    if (timeout.current) clearTimeout(timeout.current)
    setSearching(false)
  }

  async function addToLibrary(game: any) {
    try {
      const res = await fetch('/api/games/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawgId: game.rawgId, name: game.name, coverUrl: game.coverUrl, genres: game.genres, released: game.released, metacritic: game.metacritic }),
      })
      if (res.ok) setAddedGames(prev => new Set([...prev, game.rawgId]))
    } catch {}
  }

  const uniqueTop    = getUniqueGames(topGames)
  const uniqueRecent = getUniqueGames(recentGames)
  const filteredTop  = activeGenre === 'Tous' ? uniqueTop : uniqueTop.filter(i => i.games?.genres?.some((g: string) => g.toLowerCase().includes(activeGenre.toLowerCase())))
  const suggestions  = uniqueTop.filter(i => i.games?.genres?.some((g: string) => myGenres.includes(g))).slice(0, 6)

  const isSearching = searchQuery.length >= 2

  return (
    <div className="flex h-full">

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 lg:p-7">

          {/* Header */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-1.5">Découverte</p>
            <h1 className="font-serif text-3xl lg:text-4xl font-black tracking-tight leading-none mb-1.5 text-ink dark:text-ink-dark">
              <em className="italic text-amber">Découvrir</em> de nouveaux jeux
            </h1>
            <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic">
              Basé sur ta communauté GameTrack
            </p>
          </div>

          {/* ── SEARCH BOX PROMINENT ── */}
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none text-lg">⌕</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Rechercher un jeu sur RAWG.io…"
              className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-md)] pl-11 pr-10 py-3.5 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20 shadow-card"
            />
            {/* Spinner ou bouton X */}
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin" />
            )}
            {!searching && searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-hover dark:hover:bg-hover-dark transition-all text-sm"
              >
                ✕
              </button>
            )}

            {/* Résultats dropdown */}
            {isSearching && !searching && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card dark:bg-card-dark rounded-[var(--radius-md)] shadow-modal border border-surface dark:border-surface-dark z-50 overflow-hidden"
                style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {searchResults.map((g, i) => {
                  const added = addedGames.has(g.rawgId)
                  return (
                    <div key={g.rawgId}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface dark:hover:bg-surface-dark transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid var(--color-surface)' : undefined }}>
                      <div className="w-12 h-8 rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                        {g.coverUrl
                          ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-base">🎮</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-bold truncate text-ink dark:text-ink-dark">{g.name}</p>
                        <p className="text-[11px] text-ink-subtle">
                          {[g.genres?.[0], g.released?.split('-')[0], g.metacritic ? `${g.metacritic} MC` : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <button
                        onClick={() => !added && addToLibrary(g)}
                        disabled={added}
                        className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] transition-all"
                        style={{
                          background: added ? 'var(--color-forest-bg)' : 'var(--color-ink)',
                          color:      added ? 'var(--color-forest)'    : 'var(--color-paper)',
                        }}
                      >
                        {added ? '✓' : '+ Ajouter'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Aucun résultat */}
            {isSearching && !searching && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card dark:bg-card-dark rounded-[var(--radius-md)] shadow-modal border border-surface dark:border-surface-dark z-50 px-4 py-6 text-center">
                <p className="text-sm text-ink-muted dark:text-ink-subtle">Aucun jeu trouvé pour <strong className="text-ink dark:text-ink-dark">"{searchQuery}"</strong></p>
              </div>
            )}
          </div>

          {/* ── Contenu principal (masqué pendant la recherche active) ── */}
          {!isSearching && (
            <>
              {/* Genre filters */}
              <div className="flex gap-2 mb-7 overflow-x-auto pb-1">
                {ALL_GENRES.map(g => (
                  <button key={g} onClick={() => setActiveGenre(g)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 shadow-card"
                    style={{ background: activeGenre === g ? 'var(--color-ink)' : 'var(--color-card)', color: activeGenre === g ? 'var(--color-paper)' : 'var(--color-ink-subtle)' }}>
                    {g}
                  </button>
                ))}
              </div>

              {/* Top jeux */}
              {filteredTop.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">Top jeux de la <em className="italic text-amber">communauté</em></h2>
                    <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {filteredTop.slice(0, 3).map((item, idx) => {
                      const game = item.games
                      const avg  = avgRating(topGames, game.id)
                      const year = game.released_at ? new Date(game.released_at).getFullYear() : null
                      const rankColor = idx === 0 ? 'var(--color-amber-mid)' : idx === 1 ? 'var(--color-ink-subtle)' : 'var(--color-amber)'
                      return (
                        <div key={game.id} className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] overflow-hidden cursor-pointer hover:-translate-y-1 transition-all hover:shadow-hover shadow-card">
                          <div className="relative h-36 bg-surface dark:bg-surface-dark">
                            {game.cover_url ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>}
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
                            <span className="absolute top-2 left-2 font-serif text-xl font-black" style={{ color: rankColor, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{String(idx + 1).padStart(2, '0')}</span>
                            {avg && <span className="absolute bottom-2 left-2 text-xs text-white font-bold font-mono" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>★ {avg}</span>}
                          </div>
                          <div className="p-3">
                            <p className="font-serif text-sm font-black truncate text-ink dark:text-ink-dark">{game.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-ink-subtle uppercase tracking-wider">{game.genres?.[0]}</p>
                              {year && <p className="text-[10px] text-ink-subtle">{year}</p>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    {filteredTop.slice(3).map((item, idx) => {
                      const game = item.games
                      const avg  = avgRating(topGames, game.id)
                      return (
                        <div key={game.id} className="flex items-center gap-4 bg-card dark:bg-card-dark rounded-[var(--radius-sm)] px-4 py-3 cursor-pointer hover:bg-hover dark:hover:bg-hover-dark transition-colors shadow-card">
                          <span className="font-serif text-sm font-bold text-ink-subtle w-6 text-right flex-shrink-0">{String(idx + 4).padStart(2, '0')}</span>
                          <div className="w-10 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                            {game.cover_url ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-serif text-sm font-bold truncate text-ink dark:text-ink-dark">{game.name}</p>
                            <p className="text-[10px] text-ink-subtle uppercase tracking-wider">{game.genres?.[0]}</p>
                          </div>
                          {avg && <span className="text-xs font-bold font-mono text-amber flex-shrink-0">★ {avg}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && myGenres.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">Suggestions <em className="italic text-amber">pour toi</em></h2>
                    <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestions.map((item: any) => {
                      const game = item.games
                      const avg  = avgRating(topGames, game.id)
                      return (
                        <div key={game.id} className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 cursor-pointer hover:-translate-y-1 transition-all hover:shadow-hover shadow-card flex items-center gap-3">
                          <div className="w-14 h-10 rounded-[var(--radius-sm)] overflow-hidden bg-surface dark:bg-surface-dark flex-shrink-0">
                            {game.cover_url ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-serif text-sm font-black truncate text-ink dark:text-ink-dark">{game.name}</p>
                            <p className="text-[10px] text-ink-subtle uppercase tracking-wider">{game.genres?.[0]}</p>
                          </div>
                          {avg && <span className="text-xs font-bold font-mono text-amber flex-shrink-0">★ {avg}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Récents */}
              {uniqueRecent.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">Récemment <em className="italic text-amber">ajoutés</em></h2>
                    <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {uniqueRecent.slice(0, 6).map((item: any) => {
                      const game = item.games
                      const year = game.released_at ? new Date(game.released_at).getFullYear() : null
                      return (
                        <div key={game.id} className="flex items-center gap-3 bg-card dark:bg-card-dark rounded-[var(--radius-sm)] px-4 py-3 shadow-card">
                          <div className="w-10 h-7 rounded-lg overflow-hidden bg-surface dark:bg-surface-dark flex-shrink-0">
                            {game.cover_url ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-serif text-sm font-bold truncate text-ink dark:text-ink-dark">{game.name}</p>
                            <p className="text-[10px] text-ink-subtle uppercase">{game.genres?.[0]}</p>
                          </div>
                          {year && <span className="text-[10px] text-ink-subtle flex-shrink-0">{year}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {topGames.length === 0 && recentGames.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="text-6xl mb-5">🔭</div>
                  <h3 className="font-serif text-2xl font-black mb-2 text-ink dark:text-ink-dark">Rien à découvrir pour l'instant</h3>
                  <p className="text-ink-muted dark:text-ink-subtle text-sm max-w-xs">Ajoute des jeux et invite des amis</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden xl:flex w-72 flex-shrink-0 border-l border-surface dark:border-surface-dark overflow-y-auto flex-col gap-4 p-5 bg-side dark:bg-side-dark">
        {myGenres.length > 0 && (
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
            <h3 className="font-serif text-sm font-black mb-3 text-ink dark:text-ink-dark">
              Genres <em className="italic text-amber">favoris</em>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(myGenres)].slice(0, 8).map(g => (
                <span key={g} onClick={() => setActiveGenre(g)}
                  className="text-[10px] font-semibold bg-amber-bg dark:bg-amber-bg-dark text-amber px-2.5 py-1 rounded-full cursor-pointer hover:bg-amber hover:text-black transition-colors">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}