'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface GameResult {
  rawgId: number
  name: string
  coverUrl: string | null
  genres: string[]
  released: string | null
  metacritic: number | null
}

interface UserResult {
  id: string
  username: string
  level: number
  total_games: number
}

interface ListResult {
  id: string
  title: string
  description: string | null
  game_count: number
  owner_username: string
}

type Tab = 'jeux' | 'joueurs' | 'listes'

const GENRE_COLORS: Record<string, string> = {
  'RPG': 'bg-amber-bg text-amber', 'Action': 'bg-crimson-bg text-crimson',
  'Aventure': 'bg-forest-bg text-forest', 'FPS': 'bg-cobalt-bg text-cobalt',
  'Indie': 'bg-grape-bg text-grape',
}

export default function SearchClient() {
  const [query,        setQuery]        = useState('')
  const [tab,          setTab]          = useState<Tab>('jeux')
  const [games,        setGames]        = useState<GameResult[]>([])
  const [users,        setUsers]        = useState<UserResult[]>([])
  const [lists,        setLists]        = useState<ListResult[]>([])
  const [loading,      setLoading]      = useState(false)
  const [hasSearched,  setHasSearched]  = useState(false)
  const [addedGames,   setAddedGames]   = useState<Set<number>>(new Set())

  const inputRef = useRef<HTMLInputElement>(null)
  const timeout  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // Auto-focus
  useEffect(() => { inputRef.current?.focus() }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setGames([]); setUsers([]); setLists([])
      setHasSearched(false)
      return
    }
    setLoading(true)
    setHasSearched(true)

    // Parallel fetch
    const [gamesRes, usersRes, listsRes] = await Promise.all([
      fetch(`/api/games/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
      supabase
        .from('profiles')
        .select('id, username, level, xp')
        .ilike('username', `%${q}%`)
        .limit(8),
      supabase
        .from('lists')
        .select('id, title, description, profiles(username), list_games(count)')
        .ilike('title', `%${q}%`)
        .eq('is_public', true)
        .limit(6),
    ])

    setGames(gamesRes || [])
    setUsers((usersRes.data || []).map((u: any) => ({
      id:           u.id,
      username:     u.username,
      level:        u.level || 1,
      total_games:  0,
    })))
    setLists((listsRes.data || []).map((l: any) => ({
      id:             l.id,
      title:          l.title,
      description:    l.description,
      game_count:     l.list_games?.[0]?.count || 0,
      owner_username: Array.isArray(l.profiles) ? l.profiles[0]?.username : l.profiles?.username,
    })))

    setLoading(false)
  }, [])

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = setTimeout(() => search(query), 350)
    return () => { if (timeout.current) clearTimeout(timeout.current) }
  }, [query, search])

  async function addToLibrary(game: GameResult) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upsert game
    const { data: gameRow } = await supabase
      .from('games')
      .upsert({ rawg_id: game.rawgId, name: game.name, cover_url: game.coverUrl, genres: game.genres, released_at: game.released, metacritic: game.metacritic }, { onConflict: 'rawg_id' })
      .select('id').single()

    if (!gameRow) return

    await supabase.from('library').insert({ user_id: user.id, game_id: gameRow.id, status: 'backlog' })
    await supabase.from('xp_transactions').insert({ user_id: user.id, amount: 10, reason: 'game_added' })

    setAddedGames(prev => new Set([...prev, game.rawgId]))
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'jeux',     label: '🎮 Jeux',      count: games.length },
    { key: 'joueurs',  label: '👥 Joueurs',    count: users.length },
    { key: 'listes',   label: '📋 Listes',     count: lists.length },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 pt-20 lg:pt-8">

        {/* ── Header ── */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-1.5">Recherche</p>
          <h1 className="font-serif text-3xl lg:text-4xl font-black tracking-tight leading-none text-ink dark:text-ink-dark">
            <em className="italic text-amber">Chercher</em> sur Backlogg
          </h1>
        </div>

        {/* ── Search input ── */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none">⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Jeu, joueur, liste…"
            className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-md)] pl-11 pr-4 py-3.5 text-base outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20 shadow-card"
          />
          {loading && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin block" />
            </span>
          )}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink dark:hover:text-ink-dark transition-colors text-lg"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Tabs (only when results) ── */}
        {hasSearched && (
          <div className="flex items-center gap-1 bg-card dark:bg-card-dark rounded-[var(--radius-sm)] p-1 shadow-card mb-6 w-fit">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-semibold transition-all whitespace-nowrap"
                style={{
                  background: tab === t.key ? 'var(--color-amber)' : 'transparent',
                  color:      tab === t.key ? '#000' : 'var(--color-ink-subtle)',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background: tab === t.key ? 'rgba(0,0,0,0.2)' : 'var(--color-surface)',
                      color:      tab === t.key ? '#000' : 'var(--color-ink-subtle)',
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ══════════ JEUX ══════════ */}
        {tab === 'jeux' && (
          <div className="flex flex-col gap-3">
            {!hasSearched && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="font-serif text-lg font-bold text-ink dark:text-ink-dark mb-2">Recherche un jeu</p>
                <p className="text-sm text-ink-muted dark:text-ink-subtle max-w-xs">
                  Tape le nom d'un jeu pour le trouver et l'ajouter à ta bibliothèque
                </p>
              </div>
            )}

            {hasSearched && games.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="font-serif text-lg font-bold text-ink dark:text-ink-dark mb-1">Aucun jeu trouvé</p>
                <p className="text-sm text-ink-muted dark:text-ink-subtle">Essaie un autre terme</p>
              </div>
            )}

            {games.map(g => {
              const added = addedGames.has(g.rawgId)
              const genreKey = g.genres[0] || ''
              const genreStyle = GENRE_COLORS[genreKey] || 'bg-surface text-ink-muted'

              return (
                <div
                  key={g.rawgId}
                  className="flex items-center gap-4 bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-3.5 shadow-card hover:shadow-hover transition-all group"
                >
                  {/* Cover */}
                  <div className="w-14 h-20 rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                    {g.coverUrl
                      ? <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base font-bold text-ink dark:text-ink-dark mb-1.5 truncate">{g.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {g.genres[0] && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${genreStyle}`}>
                          {g.genres[0]}
                        </span>
                      )}
                      {g.released && (
                        <span className="text-[11px] text-ink-subtle font-mono">
                          {new Date(g.released).getFullYear()}
                        </span>
                      )}
                      {g.metacritic && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: g.metacritic >= 75 ? 'var(--color-forest-bg)' : 'var(--color-amber-bg)',
                            color:      g.metacritic >= 75 ? 'var(--color-forest)'    : 'var(--color-amber)',
                          }}
                        >
                          {g.metacritic} MC
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => !added && addToLibrary(g)}
                    disabled={added}
                    className="flex-shrink-0 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all"
                    style={{
                      background: added ? 'var(--color-forest-bg)' : 'var(--color-ink)',
                      color:      added ? 'var(--color-forest)'    : 'var(--color-paper)',
                    }}
                  >
                    {added ? '✓ Ajouté' : '+ Ajouter'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════ JOUEURS ══════════ */}
        {tab === 'joueurs' && (
          <div className="flex flex-col gap-2.5">
            {hasSearched && users.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="font-serif text-lg font-bold text-ink dark:text-ink-dark mb-1">Aucun joueur trouvé</p>
                <p className="text-sm text-ink-muted dark:text-ink-subtle">Essaie un pseudo différent</p>
              </div>
            )}
            {users.map(u => (
              <Link
                key={u.id}
                href={`/profile/${u.id}`}
                className="flex items-center gap-4 bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card hover:shadow-hover transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-amber flex items-center justify-center font-serif text-sm font-black text-paper flex-shrink-0">
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink dark:text-ink-dark">{u.username}</p>
                  <p className="text-xs text-ink-subtle">Niveau {u.level}</p>
                </div>
                <span className="text-ink-subtle text-sm">→</span>
              </Link>
            ))}
          </div>
        )}

        {/* ══════════ LISTES ══════════ */}
        {tab === 'listes' && (
          <div className="flex flex-col gap-2.5">
            {hasSearched && lists.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="font-serif text-lg font-bold text-ink dark:text-ink-dark mb-1">Aucune liste trouvée</p>
                <p className="text-sm text-ink-muted dark:text-ink-subtle">Les listes publiques apparaissent ici</p>
              </div>
            )}
            {lists.map(l => (
              <Link
                key={l.id}
                href={`/lists/${l.id}`}
                className="flex flex-col bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card hover:shadow-hover transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="font-serif text-base font-bold text-ink dark:text-ink-dark">{l.title}</p>
                  <span className="text-[11px] font-mono text-ink-subtle flex-shrink-0">{l.game_count} jeux</span>
                </div>
                {l.description && (
                  <p className="text-sm text-ink-muted dark:text-ink-subtle mb-2 line-clamp-2">{l.description}</p>
                )}
                <p className="text-[11px] text-ink-subtle">par <span className="font-semibold text-amber">{l.owner_username}</span></p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}