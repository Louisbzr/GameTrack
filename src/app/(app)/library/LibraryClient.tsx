'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X, Plus, Check, Heart } from 'lucide-react'
import GameCard from '@/components/GameCard'
import AddGameModal from '@/components/library/AddGameModal'
import { PLATFORM_SHORT } from '@/lib/gametrack'
import { createClient } from '@/lib/supabase/client'

interface LibraryItem {
  id: string
  status: string
  rating: number | null
  review: string | null
  is_favorite: boolean | null
  games: {
    id: string
    name: string
    genres: string[] | null
    cover_url: string | null
    platforms: string[] | null
    released_at: string | null
  }
}

interface IgdbGame {
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

interface Props {
  userId: string
  library: LibraryItem[]
  stats: { total: number; completed: number; playing: number; avgRating: string }
  openAdd: boolean
  xp?: number
  level?: number
  streak?: number
}

const ADD_STATUSES = [
  { value: 'backlog',   label: 'À faire',   color: '#f59e0b' },
  { value: 'playing',  label: 'En cours',   color: '#3b82f6' },
  { value: 'completed',label: 'Terminé',    color: '#22c55e' },
  { value: 'dropped',  label: 'Abandonné',  color: '#ef4444' },
]

export default function LibraryClient({ userId, library, stats, openAdd }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const [search,      setSearch]      = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy,      setSortBy]      = useState<'rating' | 'year' | 'title'>('rating')
  const [selGenres,   setSelGenres]   = useState<string[]>([])
  const [selPlatform, setSelPlatform] = useState('')
  const [selStatus,   setSelStatus]   = useState('')
  const [selFavorite, setSelFavorite] = useState(false)
  const [showModal,   setShowModal]   = useState(openAdd)

  const [igdbResults, setIgdbResults] = useState<IgdbGame[]>([])
  const [searching,   setSearching]   = useState(false)
  const [focused,     setFocused]     = useState(false)
  const [selected,    setSelected]    = useState<IgdbGame | null>(null)
  const [addStatus,   setAddStatus]   = useState('backlog')
  const [adding,      setAdding]      = useState(false)
  const [addedIds,    setAddedIds]    = useState<Set<number>>(new Set())
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const libraryNames = useMemo(() =>
    new Set(library.map(l => l.games?.name?.toLowerCase()).filter(Boolean)),
  [library])

  const allGenres = useMemo(() => {
    const s = new Set<string>()
    library.forEach(l => l.games?.genres?.forEach(g => s.add(g)))
    return Array.from(s).sort()
  }, [library])

  const allPlatforms = useMemo(() => {
    const s = new Set<string>()
    library.forEach(l => l.games?.platforms?.forEach(p => {
      const label = PLATFORM_SHORT[p] ?? p
      if (label) s.add(label)
    }))
    return Array.from(s).sort()
  }, [library])

  const isSearching = search.length >= 2

  const filteredGames = useMemo(() => {
    let result = library.filter(item => {
      const g = item.games
      if (!g) return false
      const matchGenre    = selGenres.length === 0 || g.genres?.some(gen => selGenres.includes(gen))
      const matchPlatform = !selPlatform || g.platforms?.some(p => (PLATFORM_SHORT[p] ?? p) === selPlatform || p === selPlatform)
      const matchStatus   = !selStatus || item.status === selStatus
      const matchFavorite = !selFavorite || item.is_favorite === true
      return matchGenre && matchPlatform && matchStatus
    })
    result.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      if (sortBy === 'year')   return new Date(b.games?.released_at ?? '').getTime() - new Date(a.games?.released_at ?? '').getTime()
      if (sortBy === 'title')  return (a.games?.name ?? '').localeCompare(b.games?.name ?? '')
      return 0
    })
    return result
  }, [library, selGenres, selPlatform, selStatus, selFavorite, sortBy])

  const hasFilters = selGenres.length > 0 || selPlatform || selStatus || selFavorite

  function handleSearch(q: string) {
    setSearch(q)
    setSelected(null)
    setIgdbResults([])
    if (q.length < 2) return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setIgdbResults(Array.isArray(data) ? data : [])
      } finally { setSearching(false) }
    }, 350)
  }

  async function handleAdd() {
    if (!selected || adding) return
    setAdding(true)
    try {
      const { data: existing } = await supabase.from('games').select('id').eq('igdb_id', selected.igdbId).maybeSingle()
      let gameId: string
      if (existing?.id) {
        gameId = existing.id
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
        { user_id: userId, game_id: gameId, status: addStatus },
        { onConflict: 'user_id,game_id' }
      )
      await supabase.from('xp_transactions').insert({ user_id: userId, amount: 10, reason: 'game_added' })
      setAddedIds(prev => new Set([...prev, selected.igdbId]))
      setSelected(null)
      setSearch('')
      setIgdbResults([])
      router.refresh()
    } finally { setAdding(false) }
  }

  function clearFilters() {
    setSelGenres([]); setSelPlatform(''); setSelStatus('')
  }

  const showDropdown = focused && isSearching && igdbResults.length > 0

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-ink dark:text-ink-dark mb-1">Explorer les jeux</h1>
            <p className="text-sm text-ink-subtle">Découvrez, filtrez et trouvez votre prochain jeu favori.</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle z-10" />
            {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin z-10" />}
            <input type="text" placeholder="Rechercher un jeu..." value={search}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              className="w-full pl-11 pr-4 py-3 rounded-lg glass text-ink dark:text-ink-dark placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto border border-border" style={{ backgroundColor: 'hsl(var(--background))' }}>
                {igdbResults.map(g => {
                  const isAdded = addedIds.has(g.igdbId) || libraryNames.has(g.name?.toLowerCase())
                  return (
                    <button key={g.igdbId}
                      onMouseDown={e => { e.preventDefault(); setSelected(g); setAddStatus('backlog') }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-surface/50 dark:border-surface-dark/50 last:border-0 ${selected?.igdbId === g.igdbId ? 'bg-primary/10' : 'hover:bg-surface dark:hover:bg-surface-dark'}`}>
                      <div className="w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                        {g.coverUrl ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink dark:text-ink-dark truncate">{g.name}</p>
                        <p className="text-xs text-ink-subtle">{[g.released?.split('-')[0], g.genres?.[0]].filter(Boolean).join(' · ')}</p>
                      </div>
                      {isAdded ? <Check className="w-4 h-4 text-primary flex-shrink-0" /> : <Plus className="w-4 h-4 text-ink-subtle flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg glass font-medium text-sm flex items-center gap-2 transition-colors ${showFilters ? 'text-primary neon-border' : 'text-ink-muted dark:text-ink-subtle hover:text-ink dark:hover:text-ink-dark'}`}>
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        </div>

        {/* Quick-add panel */}
        {selected && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="flex gap-4 p-4 border-b border-surface/50 dark:border-surface-dark/50">
              <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                {selected.coverUrl ? <img src={selected.coverUrl} alt={selected.name} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center">🎮</div>}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <p className="font-bold text-ink dark:text-ink-dark truncate">{selected.name}</p>
                <p className="text-xs text-ink-subtle mt-0.5">{[selected.released?.split('-')[0], selected.genres?.[0]].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => { setSelected(null); setSearch('') }} className="self-start text-ink-subtle hover:text-ink dark:hover:text-ink-dark p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center gap-3 flex-wrap">
              <p className="text-xs text-ink-subtle font-medium">Statut :</p>
              <div className="flex gap-2 flex-1 flex-wrap">
                {ADD_STATUSES.map(s => (
                  <button key={s.value} onClick={() => setAddStatus(s.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: addStatus === s.value ? `${s.color}20` : 'var(--color-surface)', color: addStatus === s.value ? s.color : 'var(--color-ink-muted)', outline: addStatus === s.value ? `1.5px solid ${s.color}` : 'none' }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button onClick={handleAdd} disabled={adding}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 flex-shrink-0">
                {adding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Ajouter · +10 XP</>}
              </button>
            </div>
          </div>
        )}

        {/* Filter panel */}
        {showFilters && (
          <div className="glass rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink dark:text-ink-dark">Filtres</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Réinitialiser
                </button>
              )}
            </div>
            <div>
              <p className="text-xs text-ink-subtle mb-2">Trier par</p>
              <div className="flex gap-2 flex-wrap">
                {([['rating','Note'],['year','Année'],['title','Titre'],['favorites','Favoris']] as const).map(([key,label]) => (
                  <button key={key}
                    onClick={() => {
                      if (key === 'favorites') {
                        setSelFavorite(true)
                        setSortBy('rating')
                      } else {
                        setSelFavorite(false)
                        setSortBy(key as 'rating' | 'year' | 'title')
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      (key === 'favorites' && selFavorite) || (key !== 'favorites' && sortBy === key && !selFavorite)
                        ? 'bg-primary text-white'
                        : 'bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-ink-subtle mb-2">Statut</p>
              <div className="flex flex-wrap gap-2">
                {[['','Tous'],['playing','En cours'],['completed','Terminés'],['backlog','À faire'],['dropped','Abandonnés']].map(([val,label]) => (
                  <button key={val} onClick={() => setSelStatus(selStatus===val ? '' : val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selStatus===val ? 'bg-primary text-white' : 'bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {allGenres.length > 0 && (
              <div>
                <p className="text-xs text-ink-subtle mb-2">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {allGenres.map(genre => (
                    <button key={genre}
                      onClick={() => setSelGenres(p => p.includes(genre) ? p.filter(g => g!==genre) : [...p,genre])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selGenres.includes(genre) ? 'bg-primary text-white' : 'bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark'}`}>
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allPlatforms.length > 0 && (
              <div>
                <p className="text-xs text-ink-subtle mb-2">Plateforme</p>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map(p => (
                    <button key={p} onClick={() => setSelPlatform(selPlatform===p ? '' : p)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selPlatform===p ? 'bg-primary text-white' : 'bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div>
          <p className="text-sm font-semibold text-ink dark:text-ink-dark mb-4">
            {hasFilters ? `${filteredGames.length} résultat(s)` : `Vos jeux · ${filteredGames.length}`}
          </p>
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredGames.map((item, i) => (
                <GameCardWithFavorite key={item.id} item={item} index={i} userId={userId} supabase={supabase} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-lg p-12 text-center">
              <p className="text-ink-subtle">
                {hasFilters ? 'Aucun jeu trouvé avec ces critères.' : 'Ajoute ton premier jeu pour commencer.'}
              </p>
              {!hasFilters && (
                <button onClick={() => setShowModal(true)} className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
                  + Ajouter un jeu
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AddGameModal userId={userId} onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); router.refresh() }} />
      )}
    </div>
  )
}

function GameCardWithFavorite({ item, index, userId, supabase }: { item: any; index: number; userId: string; supabase: any }) {
  const [isFav, setIsFav] = useState<boolean>(item.is_favorite ?? false)
  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const newVal = !isFav
    setIsFav(newVal)
    await supabase.from('library').update({ is_favorite: newVal }).eq('id', item.id)
  }

  return (
    <div className="relative group">
      <GameCard
        game={{ id: item.games?.id, name: item.games?.name, cover_url: item.games?.cover_url, released_at: item.games?.released_at, rating: item.rating }}
        index={index}
      />
      <button
        onClick={toggleFav}
        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md z-10 ${
          isFav
            ? 'bg-red-500/90 text-white opacity-100'
            : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
      </button>
    </div>
  )
}