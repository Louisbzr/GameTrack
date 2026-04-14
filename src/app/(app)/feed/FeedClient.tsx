'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { STATUS_CONFIG, getAvatar, timeAgo } from '@/lib/gametrack'

interface Friend { id: string; username: string; avatar_url: string | null }
interface RecentGame { gameId: string; gameName: string; coverUrl: string | null; username: string; userId: string; addedAt: string }

interface Props {
  userId: string
  events: any[]
  friends: Friend[]
  recentGames?: RecentGame[]
  /** IDs des jeux déjà présents dans la bibliothèque — évite les doublons */
  libraryGameIds?: string[]
}

export default function FeedClient({ userId, events, friends, recentGames = [], libraryGameIds = [] }: Props) {
  const [comments,     setComments]     = useState<Record<string, string>>({})
  const [sending,      setSending]      = useState<Record<string, boolean>>({})
  const [addedGames,   setAddedGames]   = useState<Set<string>>(new Set(libraryGameIds))
  const [inviteCopied, setInviteCopied] = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  async function sendComment(eventId: string) {
    const content = comments[eventId]?.trim()
    if (!content) return
    setSending(prev => ({ ...prev, [eventId]: true }))
    await supabase.from('comments').insert({ user_id: userId, event_id: eventId, content })
    setComments(prev => ({ ...prev, [eventId]: '' }))
    setSending(prev => ({ ...prev, [eventId]: false }))
    router.refresh()
  }

  async function addGame(gameId: string) {
    // Optimistic UI immédiat
    setAddedGames(prev => new Set([...prev, gameId]))

    // Vérifie doublon avant insert
    const { data: existing } = await supabase
      .from('library')
      .select('id')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .maybeSingle()

    if (existing) return // déjà en bibliothèque, on ne fait rien

    const { error } = await supabase
      .from('library')
      .insert({ user_id: userId, game_id: gameId, status: 'backlog' })

    if (error) {
      // Rollback si l'insert a échoué pour une raison inattendue
      if (error.code !== '23505') {
        setAddedGames(prev => { const s = new Set(prev); s.delete(gameId); return s })
      }
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/register`)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  return (
    <div className="flex h-full">

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 lg:p-6 max-w-2xl">

          {/* Header */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-1.5">Social</p>
            <h1 className="font-serif text-2xl lg:text-3xl font-black tracking-tight leading-none mb-1 text-ink dark:text-ink-dark">
              Ce que jouent <em className="italic text-amber">tes amis</em>
            </h1>
            <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic">
              {events.length > 0 ? `${events.length} activités récentes` : "Aucune activité pour l'instant"}
            </p>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
              <div className="text-6xl mb-5">👥</div>
              <h3 className="font-serif text-2xl font-black mb-2 text-ink dark:text-ink-dark">Rien ici pour l'instant</h3>
              <p className="text-ink-muted dark:text-ink-subtle text-sm max-w-xs mb-6">
                Ajoute des jeux à ta bibliothèque ou invite des amis pour voir leur activité.
              </p>
              <button onClick={copyInvite}
                className="bg-ink dark:bg-card-dark text-paper dark:text-ink-dark px-6 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold hover:bg-amber hover:text-black transition-colors">
                {inviteCopied ? '✓ Lien copié !' : 'Inviter des amis'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {events.map((event: any) => {
                const profile   = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles
                const library   = Array.isArray(event.library)  ? event.library[0]  : event.library
                const game      = library?.games
                const username  = profile?.username || 'Joueur'
                const avatar    = getAvatar(username)
                const statusCfg = STATUS_CONFIG[library?.status] || STATUS_CONFIG.backlog
                const friendsCount = events.filter(e => {
                  const lib = Array.isArray(e.library) ? e.library[0] : e.library
                  return lib?.games?.id === game?.id && e.id !== event.id
                }).length

                return (
                  <div key={event.id} className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] overflow-hidden shadow-card hover:shadow-hover transition-all">

                    {/* Cover banner */}
                    {game?.cover_url && (
                      <div className="relative h-24 overflow-hidden">
                        <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover opacity-60" style={{ filter: 'blur(1px)', transform: 'scale(1.05)' }}/>
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 100%)' }}/>
                        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                          <p className="font-serif text-sm font-black text-white truncate">{game.name}</p>
                          {library?.rating && (
                            <span className="text-xs font-bold font-mono text-amber flex-shrink-0 ml-2">
                              {'★'.repeat(library.rating)}{'☆'.repeat(5 - library.rating)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      {/* User row */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <Link href={`/profile/${profile?.id}`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                            style={{ background: avatar.bg, color: avatar.text }}>
                            {username.slice(0, 2).toUpperCase()}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/profile/${profile?.id}`} className="text-sm font-bold text-ink dark:text-ink-dark hover:text-amber transition-colors">
                              {username}
                            </Link>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: statusCfg.bg, color: statusCfg.color }}>
                              {statusCfg.label}
                            </span>
                            {!game?.cover_url && library?.rating && (
                              <span className="text-xs font-bold text-amber font-mono">
                                {'★'.repeat(library.rating)}
                              </span>
                            )}
                          </div>
                          {game && !game.cover_url && (
                            <p className="font-serif text-xs font-bold text-ink-muted dark:text-ink-subtle truncate mt-0.5">{game.name}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-subtle font-mono flex-shrink-0">{timeAgo(event.created_at)}</span>
                      </div>

                      {/* Review */}
                      {library?.review && (
                        <div className="bg-surface dark:bg-surface-dark rounded-[var(--radius-sm)] px-3 py-2.5 mb-3 border-l-2 border-amber/40">
                          <p className="text-sm text-ink dark:text-ink-dark font-serif italic leading-relaxed">
                            «&nbsp;{library.review}&nbsp;»
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        {friendsCount > 0 ? (
                          <p className="text-[11px] text-ink-subtle">
                            👥 {friendsCount} autre{friendsCount > 1 ? 's' : ''} ami{friendsCount > 1 ? 's' : ''} {friendsCount > 1 ? 'jouent' : 'joue'} à ce jeu
                          </p>
                        ) : <div />}

                        {game?.id && (
                          <button
                            onClick={() => addGame(game.id)}
                            disabled={addedGames.has(game.id)}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] transition-all flex-shrink-0"
                            style={{
                              background: addedGames.has(game.id) ? 'var(--color-forest-bg)' : 'var(--color-surface)',
                              color:      addedGames.has(game.id) ? 'var(--color-forest)'    : 'var(--color-ink-muted)',
                            }}
                          >
                            {addedGames.has(game.id) ? '✓ Dans ma liste' : '+ Ajouter à ma liste'}
                          </button>
                        )}
                      </div>

                      {/* Commentaire */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Commenter…"
                          value={comments[event.id] || ''}
                          onChange={e => setComments(prev => ({ ...prev, [event.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && sendComment(event.id)}
                          className="flex-1 bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber/30 placeholder:text-ink-subtle transition-all"
                        />
                        <button
                          onClick={() => sendComment(event.id)}
                          disabled={sending[event.id] || !comments[event.id]?.trim()}
                          className="bg-surface dark:bg-surface-dark hover:bg-amber hover:text-black text-ink-muted rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          ↵
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="hidden xl:flex w-72 flex-shrink-0 border-l border-surface dark:border-surface-dark overflow-y-auto flex-col gap-4 p-5 bg-side dark:bg-side-dark">

        {/* Amis */}
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm font-black text-ink dark:text-ink-dark">
              Amis <em className="italic text-amber">({friends.length})</em>
            </h3>
            <Link href="/friends" className="text-[11px] text-amber hover:underline font-semibold">Gérer</Link>
          </div>
          {friends.length === 0 ? (
            <p className="text-xs text-ink-subtle font-serif italic">Aucun ami pour l'instant</p>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.slice(0, 6).map(f => {
                const av = getAvatar(f.username)
                return (
                  <Link key={f.id} href={`/profile/${f.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: av.bg, color: av.text }}>
                      {f.username.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-ink dark:text-ink-dark">{f.username}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Jeux récemment ajoutés par des amis */}
        {recentGames.length > 0 && (
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
            <h3 className="font-serif text-sm font-black mb-3 text-ink dark:text-ink-dark">
              Récemment <em className="italic text-amber">ajoutés</em>
            </h3>
            <div className="flex flex-col gap-2.5">
              {recentGames.slice(0, 5).map((g, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-9 h-6 rounded overflow-hidden flex-shrink-0 bg-surface dark:bg-surface-dark">
                    {g.coverUrl
                      ? <img src={g.coverUrl} alt={g.gameName} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-xs">🎮</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink dark:text-ink-dark truncate">{g.gameName}</p>
                    <p className="text-[10px] text-ink-subtle">par {g.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inviter */}
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
          <h3 className="font-serif text-sm font-black mb-1 text-ink dark:text-ink-dark">
            Inviter des <em className="italic text-amber">amis</em>
          </h3>
          <p className="text-xs text-ink-muted dark:text-ink-subtle mb-3 leading-relaxed">
            Partage le lien d'inscription Backlogg
          </p>
          <button onClick={copyInvite}
            className="w-full bg-ink dark:bg-surface-dark text-paper dark:text-ink-dark rounded-[var(--radius-sm)] py-2.5 text-xs font-semibold hover:bg-amber hover:text-black transition-colors">
            {inviteCopied ? '✓ Lien copié !' : 'Copier le lien'}
          </button>
        </div>
      </div>
    </div>
  )
}