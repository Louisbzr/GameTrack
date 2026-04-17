'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Award, CalendarDays, Users, Flame, TrendingUp, Eye, Heart, AlertTriangle, Clock } from 'lucide-react'
import GameCard from '@/components/GameCard'
import ReviewCard from '@/components/ReviewCard'

interface WeeklyGame {
  igdb_id: number
  name: string
  cover_url: string | null
  released: string | null
  genres: string[]
  platforms: string[]
  metacritic: number | null
  rating_count: number
  category_label: string | null
}

interface Props {
  userId?: string
  featuredGame: any
  featuredRating: number | null
  trendingGames: any[]
  allGames: any[]
  weeklyReleases: any[]
  friendReviews: any[]
  popularGames: { count: number; game: any }[]
  popularReviews: any[]
  recentlyVisited: any[]
}

const PLATFORM_SHORT: Record<string, string> = {
  'PC (Microsoft Windows)': 'PC',
  'PlayStation 5':          'PS5',
  'PlayStation 4':          'PS4',
  'Xbox Series X|S':        'Xbox Series',
  'Xbox One':               'Xbox One',
  'Nintendo Switch':        'Switch',
  'Nintendo Switch 2':      'Switch 2',
  'iOS':                    'iOS',
  'Android':                'Android',
  'Mac':                    'Mac',
  'Linux':                  'Linux',
}

function shortPlatform(p: string) { return PLATFORM_SHORT[p] ?? p }
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}
function heroImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.includes('igdb.com')) return url.replace(/t_[a-z0-9_]+/, 't_1080p')
  return url
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export default function HomeClient({
  featuredGame, featuredRating, trendingGames, allGames,
  friendReviews, popularGames, popularReviews, userId,
}: Props) {
  const [weeklyGames,   setWeeklyGames]   = useState<WeeklyGame[]>([])
  const [loadingWeekly, setLoadingWeekly] = useState(true)
  const [weeklyError,   setWeeklyError]   = useState<string | null>(null)
  const [weekRange,     setWeekRange]     = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    fetch('/api/games/releases')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        setWeeklyGames(data.results ?? [])
        if (data.from && data.to) setWeekRange({ from: data.from, to: data.to })
      })
      .catch(() => setWeeklyError('Impossible de charger les sorties de la semaine.'))
      .finally(() => setLoadingWeekly(false))
  }, [])

  const visibleWeekly = weeklyGames.slice(0, 6)

  const [previewGames, setPreviewGames] = useState(() => allGames.slice(0, 8))
  useEffect(() => {
    const shuffled = [...allGames].sort(() => Math.random() - 0.5)
    setPreviewGames(shuffled.slice(0, 16))
  }, [allGames])

  // ── Derniers jeux visités — chargé dynamiquement ────────────────────────
  const [recentlyVisited, setRecentlyVisited] = useState<any[]>([])
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    supabase
      .from('game_views')
      .select('visited_at, games(id, name, cover_url, genres)')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setRecentlyVisited(
          (data || []).map((r: any) => r.games).filter(Boolean)
        )
      })
  }, [userId])

  const sortedFriendReviews = [...friendReviews]
    .sort((a: any, b: any) => (b.likes ?? 0) - (a.likes ?? 0))
  const likedFriendReviews = sortedFriendReviews.filter((r: any) => (r.likes ?? 0) > 0)
  const topReviews = likedFriendReviews.length > 0
    ? likedFriendReviews
    : popularReviews.length > 0
      ? popularReviews
      : sortedFriendReviews.slice(0, 5)

  return (
    <div className="min-h-screen pt-16">

      {/* ── HERO ── */}
      {featuredGame && (
        <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
          {featuredGame.cover_url && (
            <img src={heroImageUrl(featuredGame.cover_url) ?? ''} alt={featuredGame.name}
              className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/60 to-paper/20 dark:from-paper-dark dark:via-paper-dark/60 dark:to-paper-dark/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-paper/80 to-transparent dark:from-paper-dark/80" />
          <div className="relative container mx-auto px-4 h-full flex items-end pb-16">
            <div className="max-w-xl space-y-4 fade-in">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary neon-text" />
                <span className="text-sm font-semibold text-primary neon-text">Jeu du moment</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-ink dark:text-ink-dark leading-tight">
                {featuredGame.name}
              </h1>
              {featuredGame.genres?.length > 0 && (
                <p className="text-ink-muted dark:text-ink-subtle leading-relaxed line-clamp-2">
                  {featuredGame.genres.slice(0, 3).join(' · ')}
                </p>
              )}
              <div className="flex items-center gap-4 pt-2">
                <Link href={`/games/${featuredGame.id}`}
                  className="px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                  Voir le jeu
                </Link>
                {featuredRating && (
                  <div className="flex items-center gap-2 text-sm text-ink-muted dark:text-ink-subtle">
                    <span className="neon-text font-bold text-lg">{Number(featuredRating).toFixed(1)}</span>
                    <span>/ 5</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-12 space-y-16">

        {/* ── SORTIES DE LA SEMAINE ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary neon-text" />
              <h2 className="text-2xl font-bold text-ink dark:text-ink-dark">Sorties de la semaine</h2>
              {weekRange && (
                <span className="text-xs text-ink-subtle ml-1">
                  {formatDate(weekRange.from)} – {formatDate(weekRange.to)}
                </span>
              )}
            </div>
            {!loadingWeekly && weeklyGames.length > 6 && (
              <Link href="/releases" className="text-sm text-primary neon-text hover:underline font-medium">
                Voir tout ({weeklyGames.length}) →
              </Link>
            )}
          </div>

          {loadingWeekly ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass rounded-lg p-4 flex gap-4 animate-pulse">
                  <div className="w-20 h-28 rounded-md bg-surface dark:bg-surface-dark flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-surface dark:bg-surface-dark rounded w-3/4" />
                    <div className="h-3 bg-surface dark:bg-surface-dark rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : weeklyError ? (
            <ErrorBanner message={weeklyError} />
          ) : weeklyGames.length === 0 ? (
            <p className="text-sm text-ink-subtle italic">Aucune sortie cette semaine.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleWeekly.map((g) => {
                const platforms = g.platforms.map(shortPlatform).slice(0, 4)
                return (
                  <Link key={g.igdb_id} href="/releases"
                    className="glass rounded-lg p-4 flex gap-4 group hover:border-primary/50 transition-colors">
                    <div className="w-20 h-28 rounded-md overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                      {g.cover_url
                        ? <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
                      }
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-ink dark:text-ink-dark group-hover:text-primary transition-colors line-clamp-2 leading-snug">{g.name}</h3>
                        {g.category_label && (
                          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                            {g.category_label}
                          </span>
                        )}
                      </div>
                      {g.genres?.[0] && <p className="text-xs text-ink-subtle">{g.genres.slice(0, 2).join(', ')}</p>}
                      <div className="flex flex-wrap gap-1">
                        {platforms.map((p: string) => (
                          <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-surface dark:bg-surface-dark text-ink-subtle">{p}</span>
                        ))}
                      </div>
                      {g.released && <p className="text-xs text-primary neon-text font-medium">{formatDate(g.released)}</p>}
                      {g.metacritic ? (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">{g.metacritic} MC</span>
                      ) : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── VOS AMIS EN PARLENT ── */}
        {friendReviews.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary neon-text" />
              <h2 className="text-2xl font-bold text-ink dark:text-ink-dark">Vos amis en parlent</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friendReviews.map((item: any) => (
                <div key={item.id} className="relative">
                  <div className="absolute -top-1 -right-1 z-10 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Ami</div>
                  <ReviewCard
                    review={{
                      id: item.id,
                      username: item.profiles?.username ?? 'Joueur',
                      avatar_color: item.profiles?.avatar_color,
                      avatar_url: (item.profiles as any)?.avatar_url ?? undefined,
                      rating: item.rating,
                      review: item.review,
                      updated_at: item.updated_at,
                      likes: item.likes ?? 0,
                      likedByMe: item.likedByMe ?? false,
                    }}
                    gameTitle={item.games?.name}
                    gameId={item.games?.id}
                    currentUserId={userId}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── POPULAIRE DANS LA COMMUNAUTÉ ── */}
        {(popularGames.length > 0 || topReviews.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-5 h-5 text-primary neon-text" />
              <h2 className="text-2xl font-bold text-ink dark:text-ink-dark">Populaire dans la communauté</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {popularGames.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink-subtle flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Les plus vus
                  </h3>
                  <div className="space-y-2">
                    {popularGames.map(({ game, count }, i) => (
                      <Link key={game.id} href={`/games/${game.id}`}
                        className="glass rounded-lg p-3 flex items-center gap-3 group hover:border-primary/50 transition-colors">
                        <span className="text-lg font-bold text-primary/50 w-6 text-center">{i + 1}</span>
                        <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                          {game.cover_url
                            ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-sm">🎮</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-ink dark:text-ink-dark truncate group-hover:text-primary transition-colors">{game.name}</p>
                          {game.genres?.[0] && <p className="text-xs text-ink-subtle">{game.genres[0]}</p>}
                        </div>
                        <p className="text-xs text-ink-subtle flex items-center gap-1 flex-shrink-0">
                          <Eye className="w-3 h-3" />
                          {count > 999 ? `${(count / 1000).toFixed(0)}k` : count}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {topReviews.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink-subtle flex items-center gap-1.5">
                    <Heart className="w-4 h-4" />
                    {likedFriendReviews.length > 0 ? 'Avis aimés par vos amis' : <a href="/top-reviews" className="hover:underline">Avis les plus aimés →</a>}
                  </h3>
                  <div className="space-y-2">
                    {topReviews.slice(0, 5).map((item: any) => (
                      <ReviewCard
                        key={`pop-${item.id}`}
                        review={{
                          id: item.id,
                          username: item.profiles?.username ?? 'Joueur',
                          avatar_color: item.profiles?.avatar_color,
                          avatar_url: (item.profiles as any)?.avatar_url ?? undefined,
                          rating: item.rating,
                          review: item.review,
                          updated_at: item.updated_at,
                          likes: item.likes ?? 0,
                          likedByMe: false,
                        }}
                        gameTitle={item.games?.name}
                        gameId={item.games?.id}
                        currentUserId={userId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TENDANCES ── */}
        {trendingGames.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary neon-text" />
              <h2 className="text-2xl font-bold text-ink dark:text-ink-dark">Tendances</h2>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {trendingGames.map((game: any, i: number) => (
                <GameCard key={game.id} game={game} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── DERNIERS JEUX VISITÉS ── */}
        {recentlyVisited.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary neon-text" />
                <h2 className="text-2xl font-bold text-ink dark:text-ink-dark">Derniers jeux visités</h2>
              </div>
              <Link href="/recently-visited" className="text-sm text-primary neon-text hover:underline font-medium">
                Voir tout →
              </Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {recentlyVisited.map((game: any, i: number) => (
                <GameCard key={`recent-${game.id}`} game={game} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── TOUS LES JEUX ── */}
        {allGames.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-ink dark:text-ink-dark">Tous les jeux</h2>
              <Link href="/library" className="text-sm text-primary neon-text hover:underline font-medium">
                Voir tout →
              </Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {previewGames.map((game: any, i: number) => (
                <GameCard key={`all-${game.id}`} game={game} index={i} />
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <Link href="/library"
                className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                Voir plus →
              </Link>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}