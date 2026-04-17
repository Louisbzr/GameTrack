'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Clock, Search, X } from 'lucide-react'

interface Game {
  id: string
  name: string
  cover_url: string | null
  genres: string[] | null
  platforms: string[] | null
  released_at: string | null
  visited_at: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return "À l'instant"
  if (m < 60)  return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function RecentlyVisitedClient({ games }: { games: Game[] }) {
  const [search, setSearch]       = useState('')
  const [genreFilter, setGenreFilter] = useState<string | null>(null)

  // Collect all unique genres
  const allGenres = useMemo(() => {
    const set = new Set<string>()
    games.forEach(g => g.genres?.forEach(genre => set.add(genre)))
    return Array.from(set).sort()
  }, [games])

  const filtered = useMemo(() => {
    return games.filter(g => {
      const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase())
      const matchGenre  = !genreFilter || g.genres?.includes(genreFilter)
      return matchSearch && matchGenre
    })
  }, [games, search, genreFilter])

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-6 h-6 text-primary neon-text" />
            <h1 className="text-3xl font-bold text-foreground">Derniers jeux visités</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-9">{games.length} jeux visités</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un jeu..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Genre filter */}
          {allGenres.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setGenreFilter(null)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  !genreFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                Tous
              </button>
              {allGenres.slice(0, 8).map(genre => (
                <button
                  key={genre}
                  onClick={() => setGenreFilter(genreFilter === genre ? null : genre)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    genreFilter === genre ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {(search || genreFilter) && (
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </p>
        )}

        {/* Games grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-foreground">Aucun jeu trouvé</p>
            <p className="text-sm mt-1">Essaie une autre recherche ou un autre filtre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {filtered.map(game => (
              <Link key={game.id} href={`/games/${game.id}`} className="group block">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary border border-white/5">
                  {game.cover_url
                    ? <img src={game.cover_url} alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🎮</div>
                  }
                  {/* Visited time badge */}
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                    <p className="text-[9px] text-white/70 font-medium">{timeAgo(game.visited_at)}</p>
                  </div>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">{game.name}</p>
                {game.released_at && (
                  <p className="text-[10px] text-muted-foreground">{new Date(game.released_at).getFullYear()}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}