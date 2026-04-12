'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PLATFORM_SHORT, RATING_LABELS, STATUS_CONFIG, grantDailyXp } from '@/lib/gametrack'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Game {
  id: string
  name: string
  cover_url: string | null
  genres: string[] | null
  platforms: string[] | null
  released_at: string | null
  metacritic: number | null
}

interface Profile {
  id: string
  username: string
  avatar_url: string | null
}

interface LibraryRow {
  id: string
  status: string
  rating: number | null
  review: string | null
  created_at: string
  completed_at: string | null
  games: Game
  profiles?: Profile | Profile[] | null
}

interface GameStats {
  avg_rating: string | null
  player_count: number
  completed_count: number
  review_count: number
}

interface Props {
  entry: LibraryRow
  userId: string
  communityReviews: (LibraryRow & { like_count?: number })[]
  friendActivity: LibraryRow[]
  gameStats: GameStats | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: 'backlog',   label: '🕐 À commencer', activeBg: 'var(--color-surface)',    activeText: 'var(--color-ink-muted)' },
  { value: 'playing',   label: '▶ En cours',      activeBg: 'var(--color-cobalt-bg)',  activeText: 'var(--color-cobalt)' },
  { value: 'completed', label: '✓ Terminé',       activeBg: 'var(--color-forest-bg)',  activeText: 'var(--color-forest)' },
  { value: 'dropped',   label: '✕ Abandonné',     activeBg: 'var(--color-crimson-bg)', activeText: 'var(--color-crimson)' },
]

function resolveProfile(profiles: Profile | Profile[] | null | undefined): Profile | null {
  if (!profiles) return null
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles
}

function getUsername(profiles: Profile | Profile[] | null | undefined): string {
  return resolveProfile(profiles)?.username ?? 'Joueur'
}

function getProfileId(profiles: Profile | Profile[] | null | undefined): string | null {
  return resolveProfile(profiles)?.id ?? null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameDetailClient({ entry, userId, communityReviews, friendActivity, gameStats }: Props) {
  const game   = entry.games
  const router = useRouter()
  const supabase = createClient()

  const [status,       setStatus]       = useState(entry.status)
  const [rating,       setRating]       = useState(entry.rating ?? 0)
  const [review,       setReview]       = useState(entry.review ?? '')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [showDelete,   setShowDelete]   = useState(false)
  const [communityTab, setCommunityTab] = useState<'friends' | 'community'>('friends')

  const year      = game?.released_at ? new Date(game.released_at).getFullYear() : null
  const platforms = game?.platforms?.slice(0, 4) ?? []

  const friendsWhoPlayed = friendActivity.filter(f => f.profiles)

  const avgCommunityRating = (() => {
    const rated = communityReviews.filter(r => r.rating != null)
    if (rated.length === 0) return null
    return (rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length).toFixed(1)
  })()

  const topCommunityReviews = [...communityReviews]
    .filter(r => r.review)
    .sort((a, b) => ((b as any).like_count ?? 0) - ((a as any).like_count ?? 0))

  async function handleSave() {
    setSaving(true)

    const wasCompleted = entry.status === 'completed'
    const hadReview    = (entry.review ?? '').trim().length > 0
    const hadRating    = entry.rating != null && entry.rating > 0

    await supabase.from('library').update({
      status,
      rating:       rating || null,
      review:       review.trim() || null,
      updated_at:   new Date().toISOString(),
      completed_at: status === 'completed' ? (entry.completed_at ?? new Date().toISOString()) : null,
    }).eq('id', entry.id)

    await supabase.from('feed_events').insert({ user_id: userId, event_type: 'updated' })

    // ── Attribution XP ────────────────────────────────────────────────────────
    if (status === 'completed' && !wasCompleted) {
      await grantDailyXp(supabase, userId, 'complete_game')
    }
    if (review.trim().length > 0 && !hadReview) {
      await grantDailyXp(supabase, userId, 'write_review')
    }
    if (rating > 0 && !hadRating) {
      await grantDailyXp(supabase, userId, 'rate_game')
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('library').delete().eq('id', entry.id)
    router.push('/library')
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark">

      {/* ── Hero ── */}
      <div className="relative h-56 lg:h-72 overflow-hidden" style={{ background: 'var(--color-ink)' }}>
        {game?.cover_url && (
          <>
            <img src={game.cover_url} alt={game.name}
              className="absolute inset-0 w-full h-full object-cover opacity-45"
              style={{ filter: 'blur(3px)', transform: 'scale(1.08)' }}/>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.88) 100%)' }} />
          </>
        )}
        <Link href="/library" className="absolute top-4 left-4 lg:top-6 lg:left-6 text-white/60 hover:text-white transition-colors text-sm font-semibold">
          ← Bibliothèque
        </Link>
        <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8 flex items-end gap-5">
          {game?.cover_url && (
            <div className="hidden lg:block w-20 h-28 rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0 shadow-modal border border-white/10">
              <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover"/>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              {game?.genres?.slice(0, 2).map(g => (
                <span key={g} className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>{g}</span>
              ))}
              {year && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>{year}</span>}
              {game?.metacritic && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(46,125,90,0.35)', color: '#7effc0' }}>{game.metacritic} MC</span>}
            </div>
            <h1 className="font-serif text-2xl lg:text-4xl font-black text-white leading-tight mb-2">{game?.name}</h1>
            <div className="flex gap-1.5 flex-wrap">
              {platforms.map(p => (
                <span key={p} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.65)' }}>
                  {PLATFORM_SHORT[p] || p.slice(0, 4)}
                </span>
              ))}
            </div>
          </div>
          {gameStats?.avg_rating && (
            <div className="hidden lg:flex flex-col items-end flex-shrink-0">
              <div className="font-serif text-2xl font-black text-amber">★ {gameStats.avg_rating}</div>
              <div className="text-[10px] text-white/40">{gameStats.player_count} joueurs</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats strip mobile ── */}
      {gameStats && (
        <div className="lg:hidden grid grid-cols-4 gap-px bg-surface dark:bg-surface-dark border-b border-surface dark:border-surface-dark">
          {[
            { v: gameStats.avg_rating ? `★ ${gameStats.avg_rating}` : '—', l: 'Note' },
            { v: gameStats.player_count, l: 'Joueurs' },
            { v: gameStats.completed_count, l: 'Terminés' },
            { v: gameStats.review_count, l: 'Critiques' },
          ].map(s => (
            <div key={s.l} className="bg-card dark:bg-card-dark p-3 text-center">
              <div className="font-serif text-lg font-black text-ink dark:text-ink-dark">{s.v}</div>
              <div className="text-[9px] text-ink-subtle uppercase tracking-wider mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* LEFT */}
        <div className="flex flex-col gap-4">

          {/* Édition */}
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
            <h2 className="font-serif text-base font-black mb-4 text-ink dark:text-ink-dark">
              Mon <em className="italic text-amber">suivi</em>
            </h2>

            {/* Status */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2">Statut</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all"
                    style={{
                      background: status === s.value ? s.activeBg   : 'var(--color-surface)',
                      color:      status === s.value ? s.activeText  : 'var(--color-ink-muted)',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2">Note</p>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    className="text-2xl transition-all hover:scale-110"
                    style={{ color: n <= rating ? 'var(--color-amber)' : 'var(--color-surface-dark)' }}
                  >
                    ★
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-sm font-serif italic text-ink-muted dark:text-ink-subtle ml-2">
                    {RATING_LABELS[rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Review */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2">
                Critique {!entry.review && rating === 0 && <span className="text-amber normal-case font-normal">+50 XP</span>}
              </p>
              <textarea
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Tes impressions sur ce jeu…"
                rows={4}
                className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber/30 placeholder:text-ink-subtle font-serif resize-none leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-[var(--radius-sm)] text-sm font-semibold transition-all"
                style={{
                  background: saved ? 'var(--color-forest-bg)' : 'var(--color-ink)',
                  color:      saved ? 'var(--color-forest)'    : 'var(--color-paper)',
                }}
              >
                {saving ? 'Enregistrement…' : saved ? '✓ Enregistré !' : 'Enregistrer'}
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="px-4 py-3 rounded-[var(--radius-sm)] text-sm font-semibold bg-surface dark:bg-surface-dark text-crimson hover:bg-crimson-bg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>

          {/* Avis */}
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-serif text-base font-black text-ink dark:text-ink-dark">
                Avis <em className="italic text-amber">
                  {communityTab === 'friends' ? 'des amis' : 'communauté'}
                </em>
              </h2>
              <div className="flex gap-1 bg-surface dark:bg-surface-dark rounded-[var(--radius-sm)] p-1 ml-auto">
                {(['friends', 'community'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCommunityTab(tab)}
                    className="px-3 py-1 rounded-[6px] text-[11px] font-semibold transition-all"
                    style={{
                      background: communityTab === tab ? 'var(--color-ink)' : 'transparent',
                      color:      communityTab === tab ? 'var(--color-paper)' : 'var(--color-ink-subtle)',
                    }}
                  >
                    {tab === 'friends' ? 'Amis' : 'Tous'}
                  </button>
                ))}
              </div>
              {avgCommunityRating && (
                <span className="text-sm font-mono font-bold text-amber flex-shrink-0">★ {avgCommunityRating}</span>
              )}
            </div>

            {/* Tab amis */}
            {communityTab === 'friends' && (
              <div className="flex flex-col gap-3">
                {friendsWhoPlayed.length === 0 ? (
                  <p className="text-center py-6 text-sm text-ink-muted dark:text-ink-subtle font-serif italic">Aucun ami n'a joué à ce jeu</p>
                ) : friendsWhoPlayed.map((f, i) => {
                  const username  = getUsername(f.profiles)
                  const profileId = getProfileId(f.profiles)
                  const statusCfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.backlog
                  return (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-surface dark:border-surface-dark last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center text-[11px] font-bold text-paper flex-shrink-0">
                        {username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Link href={`/profile/${profileId}`} className="text-sm font-semibold text-ink dark:text-ink-dark hover:text-amber transition-colors">
                            {username}
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: statusCfg.bg, color: statusCfg.color }}>
                              {statusCfg.label}
                            </span>
                            {f.rating && <span className="text-xs font-mono text-amber">★ {f.rating * 2}/10</span>}
                          </div>
                        </div>
                        {f.review && (
                          <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic leading-relaxed border-l-2 border-amber/30 pl-3">
                            «&nbsp;{f.review}&nbsp;»
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tab communauté */}
            {communityTab === 'community' && (
              <div className="flex flex-col gap-3">
                {topCommunityReviews.length === 0 ? (
                  <p className="text-center py-6 text-sm text-ink-muted dark:text-ink-subtle font-serif italic">Aucune critique pour l'instant</p>
                ) : topCommunityReviews.map((r, i) => {
                  const username = getUsername(r.profiles)
                  return (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-surface dark:border-surface-dark last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-[11px] font-bold text-ink-muted flex-shrink-0">
                        {username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-ink dark:text-ink-dark">{username}</span>
                          {r.rating && <span className="text-xs font-mono text-amber">★ {r.rating * 2}/10</span>}
                        </div>
                        <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic leading-relaxed">
                          «&nbsp;{r.review}&nbsp;»
                        </p>
                        {((r as any).like_count ?? 0) > 0 && (
                          <p className="text-[10px] text-ink-subtle mt-1.5">👍 {(r as any).like_count} personnes ont trouvé ça utile</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">

          {/* Stats globales */}
          {gameStats && (
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
              <h3 className="font-serif text-sm font-black mb-3 text-ink dark:text-ink-dark">Stats <em className="italic text-amber">globales</em></h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: gameStats.avg_rating ? `★ ${gameStats.avg_rating}` : '—', l: 'Note moy.',  c: 'text-amber' },
                  { v: gameStats.player_count,    l: 'Joueurs',   c: 'text-cobalt' },
                  { v: gameStats.completed_count, l: 'Terminés',  c: 'text-forest' },
                  { v: gameStats.review_count,    l: 'Critiques', c: 'text-ink-muted' },
                ].map(s => (
                  <div key={s.l} className="bg-surface dark:bg-surface-dark rounded-[var(--radius-sm)] p-3 text-center">
                    <div className={`font-serif text-xl font-black ${s.c}`}>{s.v}</div>
                    <div className="text-[10px] text-ink-subtle mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Infos */}
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
            <h3 className="font-serif text-sm font-black mb-3 text-ink dark:text-ink-dark">Infos du jeu</h3>
            <div className="flex flex-col">
              {([
                year             && { k: 'Sortie',    v: String(year) },
                game?.genres?.length && { k: 'Genre', v: game.genres!.slice(0, 2).join(', ') },
                               { k: 'Ajouté le',  v: new Date(entry.created_at).toLocaleDateString('fr-FR') },
                entry.completed_at && { k: 'Terminé le', v: new Date(entry.completed_at).toLocaleDateString('fr-FR') },
              ] as ({ k: string; v: string } | false)[])
                .filter(Boolean)
                .map(row => (
                  <div key={(row as any).k} className="flex justify-between items-center py-2.5 border-b border-surface dark:border-surface-dark last:border-0 text-sm">
                    <span className="text-ink-muted dark:text-ink-subtle">{(row as any).k}</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">{(row as any).v}</span>
                  </div>
                ))}
              {game?.metacritic && (
                <div className="flex justify-between items-center py-2.5 text-sm">
                  <span className="text-ink-muted dark:text-ink-subtle">Metacritic</span>
                  <span className="font-bold px-2 py-0.5 rounded text-xs"
                    style={{ background: game.metacritic >= 75 ? 'var(--color-forest-bg)' : 'var(--color-amber-bg)', color: game.metacritic >= 75 ? 'var(--color-forest)' : 'var(--color-amber)' }}>
                    {game.metacritic}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Amis compact */}
          {friendsWhoPlayed.length > 0 && (
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
              <h3 className="font-serif text-sm font-black mb-3 text-ink dark:text-ink-dark"><em className="italic text-amber">Amis</em> qui jouent</h3>
              <div className="flex flex-col gap-2.5">
                {friendsWhoPlayed.slice(0, 4).map((f, i) => {
                  const username = getUsername(f.profiles)
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber flex items-center justify-center text-[10px] font-bold text-paper flex-shrink-0">
                        {username.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-ink dark:text-ink-dark flex-1 truncate">{username}</span>
                      {f.rating && <span className="text-xs font-mono text-amber flex-shrink-0">★ {f.rating * 2}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-xl)] p-6 w-full max-w-sm shadow-modal">
            <h3 className="font-serif text-xl font-black mb-2 text-ink dark:text-ink-dark">Supprimer ce jeu ?</h3>
            <p className="text-sm text-ink-muted dark:text-ink-subtle mb-6 leading-relaxed">
              <strong className="text-ink dark:text-ink-dark">{game?.name}</strong> sera retiré. Action irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-surface dark:bg-surface-dark text-ink-muted hover:bg-hover transition-colors">Annuler</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-crimson text-white hover:opacity-90 disabled:opacity-50">
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}