'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUSES = [
  { value: 'backlog',   label: '🕐 À commencer', activeBg: 'var(--color-surface)',    activeText: 'var(--color-ink-muted)' },
  { value: 'playing',   label: '▶ En cours',      activeBg: 'var(--color-cobalt-bg)',  activeText: 'var(--color-cobalt)' },
  { value: 'completed', label: '✓ Terminé',       activeBg: 'var(--color-forest-bg)',  activeText: 'var(--color-forest)' },
  { value: 'dropped',   label: '✕ Abandonné',     activeBg: 'var(--color-crimson-bg)', activeText: 'var(--color-crimson)' },
]

const PLATFORM_SHORT: Record<string, string> = {
  'PlayStation 5': 'PS5', 'PlayStation 4': 'PS4', 'Xbox One': 'XBO',
  'Xbox Series S/X': 'XSX', 'Nintendo Switch': 'NSW', 'PC': 'PC',
}

const RATING_LABELS = ['', 'Nul', 'Bof', 'Bien', 'Super', "Chef-d'œuvre"]

interface Props {
  entry: any
  userId: string
  communityReviews: any[]
  friendActivity: any[]
  gameStats: any | null
}

function getUsername(profiles: any) {
  if (!profiles) return 'Joueur'
  return Array.isArray(profiles) ? (profiles[0]?.username ?? 'Joueur') : (profiles.username ?? 'Joueur')
}

function getProfileId(profiles: any) {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0]?.id : profiles.id
}

export default function GameDetailClient({ entry, userId, communityReviews, friendActivity, gameStats }: Props) {
  const game   = entry.games
  const router = useRouter()
  const supabase = createClient()

  const [status,            setStatus]            = useState(entry.status)
  const [rating,            setRating]            = useState(entry.rating || 0)
  const [review,            setReview]            = useState(entry.review || '')
  const [saving,            setSaving]            = useState(false)
  const [saved,             setSaved]             = useState(false)
  const [deleting,          setDeleting]          = useState(false)
  const [showDelete,        setShowDelete]        = useState(false)
  const [communityTab,      setCommunityTab]      = useState<'friends' | 'community'>('friends')

  const year      = game?.released_at ? new Date(game.released_at).getFullYear() : null
  const platforms = game?.platforms?.slice(0, 4) || []
  const friendsWhoPlayed    = (friendActivity || []).filter(f => f.profiles)
  const avgCommunityRating  = communityReviews.filter(r => r.rating).length > 0
    ? (communityReviews.filter(r => r.rating).reduce((a: number, r: any) => a + r.rating, 0) / communityReviews.filter(r => r.rating).length).toFixed(1)
    : null
  const topCommunityReviews = [...communityReviews]
    .filter(r => r.review)
    .sort((a: any, b: any) => (b.like_count || 0) - (a.like_count || 0))

  async function handleSave() {
    setSaving(true)
    await supabase.from('library').update({
      status, rating: rating || null, review: review.trim() || null,
      updated_at: new Date().toISOString(),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    }).eq('id', entry.id)
    await supabase.from('feed_events').insert({ user_id: userId, event_type: 'updated' })
    setSaving(false); setSaved(true)
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
              {game?.genres?.slice(0, 2).map((g: string) => (
                <span key={g} className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>{g}</span>
              ))}
              {year && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>{year}</span>}
              {game?.metacritic && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(46,125,90,0.35)', color: '#7effc0' }}>{game.metacritic} MC</span>}
            </div>
            <h1 className="font-serif text-2xl lg:text-4xl font-black text-white leading-tight mb-2">{game?.name}</h1>
            <div className="flex gap-1.5 flex-wrap">
              {platforms.map((p: string) => (
                <span key={p} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.65)' }}>
                  {PLATFORM_SHORT[p] || p.slice(0, 4)}
                </span>
              ))}
            </div>
          </div>
          {/* Stats globales hero desktop */}
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
            <div key={s.l} className="bg-card dark:bg-card-dark px-3 py-2.5 text-center">
              <div className="font-serif text-base font-black text-amber">{s.v}</div>
              <div className="text-[9px] text-ink-subtle">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Status */}
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
              <h2 className="font-serif text-base font-black mb-4 text-ink dark:text-ink-dark">
                Statut dans ta <em className="italic text-amber">bibliothèque</em>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className="py-3 px-4 rounded-[var(--radius-sm)] text-sm font-semibold transition-all text-left"
                    style={{ background: status === s.value ? s.activeBg : 'var(--color-surface)', color: status === s.value ? s.activeText : 'var(--color-ink-subtle)', transform: status === s.value ? 'scale(1.02)' : 'scale(1)', fontWeight: status === s.value ? 700 : 500 }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
              <h2 className="font-serif text-base font-black mb-3 text-ink dark:text-ink-dark">Ta <em className="italic text-amber">note</em></h2>
              <div className="flex items-center gap-3">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setRating(rating === i ? 0 : i)}
                    className="text-4xl transition-all hover:scale-110 active:scale-95 leading-none"
                    style={{ color: i <= rating ? 'var(--color-amber)' : 'var(--color-surface)' }}>★</button>
                ))}
                {rating > 0 && <span className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic">{RATING_LABELS[rating]}</span>}
              </div>
            </div>

            {/* Review */}
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-base font-black text-ink dark:text-ink-dark">Ta <em className="italic text-amber">critique</em></h2>
                {!entry.review && <span className="text-[10px] font-bold text-amber bg-amber-bg dark:bg-amber-bg-dark px-2 py-0.5 rounded-full">+20 XP</span>}
              </div>
              <textarea value={review} onChange={e => setReview(e.target.value)}
                placeholder="Partage ton avis avec la communauté…" rows={4} maxLength={500}
                className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none resize-none transition-all placeholder:text-ink-subtle font-serif"
                style={{ boxShadow: review ? '0 0 0 2px var(--color-amber)' : undefined }}/>
              {review && <p className="text-[10px] text-ink-subtle text-right mt-1">{review.length}/500</p>}
            </div>

            {/* Save / Delete */}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-[var(--radius-sm)] text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: saved ? 'var(--color-forest-bg)' : 'var(--color-ink)', color: saved ? 'var(--color-forest)' : 'var(--color-paper)' }}>
                {saving ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>Sauvegarde…</> : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
              </button>
              <button onClick={() => setShowDelete(true)} className="px-4 py-3 rounded-[var(--radius-sm)] text-sm font-semibold text-crimson hover:bg-crimson-bg transition-colors">
                Supprimer
              </button>
            </div>

            {/* ══ Amis + Communauté ══ */}
            <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 bg-surface dark:bg-surface-dark rounded-[var(--radius-sm)] p-1">
                  {[
                    { key: 'friends',   label: `👥 Amis (${friendsWhoPlayed.length})` },
                    { key: 'community', label: `🌐 Communauté` },
                  ].map(t => (
                    <button key={t.key} onClick={() => setCommunityTab(t.key as any)}
                      className="px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all"
                      style={{ background: communityTab === t.key ? 'var(--color-ink)' : 'transparent', color: communityTab === t.key ? 'var(--color-paper)' : 'var(--color-ink-subtle)' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {communityTab === 'community' && avgCommunityRating && (
                  <span className="font-serif text-sm font-bold text-amber">★ {avgCommunityRating} moy.</span>
                )}
              </div>

              {/* Tab amis */}
              {communityTab === 'friends' && (
                <div className="flex flex-col gap-3">
                  {friendsWhoPlayed.length === 0 ? (
                    <p className="text-center py-6 text-sm text-ink-muted dark:text-ink-subtle font-serif italic">Aucun ami n'a joué à ce jeu</p>
                  ) : friendsWhoPlayed.map((f: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-surface dark:border-surface-dark last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center text-[11px] font-bold text-paper flex-shrink-0">
                        {getUsername(f.profiles).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Link href={`/profile/${getProfileId(f.profiles)}`} className="text-sm font-semibold text-ink dark:text-ink-dark hover:text-amber transition-colors">
                            {getUsername(f.profiles)}
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: f.status === 'completed' ? 'var(--color-forest-bg)' : f.status === 'playing' ? 'var(--color-amber-bg)' : 'var(--color-surface)', color: f.status === 'completed' ? 'var(--color-forest)' : f.status === 'playing' ? 'var(--color-amber)' : 'var(--color-ink-subtle)' }}>
                              {f.status === 'completed' ? 'Terminé' : f.status === 'playing' ? 'En cours' : 'Backlog'}
                            </span>
                            {f.rating && <span className="text-xs font-mono text-amber">★ {f.rating * 2}/10</span>}
                          </div>
                        </div>
                        {f.review && <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic leading-relaxed border-l-2 border-amber/30 pl-3">«&nbsp;{f.review}&nbsp;»</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab communauté */}
              {communityTab === 'community' && (
                <div className="flex flex-col gap-3">
                  {topCommunityReviews.length === 0 ? (
                    <p className="text-center py-6 text-sm text-ink-muted dark:text-ink-subtle font-serif italic">Aucune critique pour l'instant</p>
                  ) : topCommunityReviews.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-surface dark:border-surface-dark last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-[11px] font-bold text-ink-muted flex-shrink-0">
                        {getUsername(r.profiles).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-ink dark:text-ink-dark">{getUsername(r.profiles)}</span>
                          {r.rating && <span className="text-xs font-mono text-amber">★ {r.rating * 2}/10</span>}
                        </div>
                        <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic leading-relaxed">«&nbsp;{r.review}&nbsp;»</p>
                        {(r.like_count || 0) > 0 && <p className="text-[10px] text-ink-subtle mt-1.5">👍 {r.like_count} personnes ont trouvé ça utile</p>}
                      </div>
                    </div>
                  ))}
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
                    { v: gameStats.avg_rating ? `★ ${gameStats.avg_rating}` : '—', l: 'Note moy.', c: 'text-amber' },
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
                {[
                  year && { k: 'Sortie', v: year },
                  game?.genres?.length > 0 && { k: 'Genre', v: game.genres.slice(0, 2).join(', ') },
                  { k: 'Ajouté le', v: new Date(entry.created_at).toLocaleDateString('fr-FR') },
                  entry.completed_at && { k: 'Terminé le', v: new Date(entry.completed_at).toLocaleDateString('fr-FR') },
                ].filter(Boolean).map((row: any) => (
                  <div key={row.k} className="flex justify-between items-center py-2.5 border-b border-surface dark:border-surface-dark last:border-0 text-sm">
                    <span className="text-ink-muted dark:text-ink-subtle">{row.k}</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">{row.v}</span>
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
                  {friendsWhoPlayed.slice(0, 4).map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber flex items-center justify-center text-[10px] font-bold text-paper flex-shrink-0">
                        {getUsername(f.profiles).slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-ink dark:text-ink-dark flex-1 truncate">{getUsername(f.profiles)}</span>
                      {f.rating && <span className="text-xs font-mono text-amber flex-shrink-0">★ {f.rating * 2}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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