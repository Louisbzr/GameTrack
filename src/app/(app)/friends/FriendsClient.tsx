'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Friend {
  id: string
  username: string
  level: number
  avatar_url: string | null
}

interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  requester: { id: string; username: string; level: number } | null
  addressee: { id: string; username: string; level: number } | null
}

interface Props {
  userId: string
  friends: Friend[]
  pendingReceived: FriendRequest[]
  pendingSent: FriendRequest[]
}

function Avatar({ username, size = 'md' }: { username: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-[11px]' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-full bg-amber flex items-center justify-center font-serif font-black text-paper flex-shrink-0`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  )
}

export default function FriendsClient({ userId, friends: initialFriends, pendingReceived: initialReceived, pendingSent: initialSent }: Props) {
  const [friends,         setFriends]         = useState<Friend[]>(initialFriends)
  const [pendingReceived, setPendingReceived]  = useState<FriendRequest[]>(initialReceived)
  const [pendingSent,     setPendingSent]      = useState<FriendRequest[]>(initialSent)
  const [searchQuery,     setSearchQuery]      = useState('')
  const [searchResults,   setSearchResults]    = useState<Friend[]>([])
  const [searching,       setSearching]        = useState(false)
  const [activeTab,       setActiveTab]        = useState<'friends' | 'requests' | 'find'>('friends')

  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // Recherche utilisateurs
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    if (timeout.current) clearTimeout(timeout.current)
    setSearching(true)
    timeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, level, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', userId)
        .limit(10)
      setSearchResults(data || [])
      setSearching(false)
    }, 350)
    return () => { if (timeout.current) clearTimeout(timeout.current) }
  }, [searchQuery])

  function getFriendshipStatus(targetId: string): 'none' | 'friends' | 'sent' | 'received' {
    if (friends.some(f => f.id === targetId)) return 'friends'
    if (pendingSent.some(r => r.addressee_id === targetId)) return 'sent'
    if (pendingReceived.some(r => r.requester_id === targetId)) return 'received'
    return 'none'
  }

  async function sendRequest(targetId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: targetId, status: 'pending' })
      .select('*, requester:profiles!friendships_requester_id_fkey(id,username,level), addressee:profiles!friendships_addressee_id_fkey(id,username,level)')
      .single()
    if (!error && data) {
      setPendingSent(prev => [...prev, data])
    }
  }

  async function acceptRequest(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    const req = pendingReceived.find(r => r.id === friendshipId)
    if (req?.requester) {
      setFriends(prev => [...prev, { id: req.requester!.id, username: req.requester!.username, level: req.requester!.level, avatar_url: null }])
    }
    setPendingReceived(prev => prev.filter(r => r.id !== friendshipId))
  }

  async function declineRequest(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'declined' }).eq('id', friendshipId)
    setPendingReceived(prev => prev.filter(r => r.id !== friendshipId))
  }

  async function cancelRequest(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setPendingSent(prev => prev.filter(r => r.id !== friendshipId))
  }

  async function removeFriend(friendId: string) {
    await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
    setFriends(prev => prev.filter(f => f.id !== friendId))
  }

  const tabs = [
    { key: 'friends',  label: 'Amis',        count: friends.length },
    { key: 'requests', label: 'Demandes',     count: pendingReceived.length },
    { key: 'find',     label: 'Trouver',      count: 0 },
  ] as const

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 pt-4">

      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-1">Social</p>
        <h1 className="font-serif text-3xl font-black tracking-tight text-ink dark:text-ink-dark">
          Mes <em className="italic text-amber">amis</em>
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card dark:bg-card-dark rounded-[var(--radius-sm)] p-1 shadow-card mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--color-ink)' : 'transparent',
              color:      activeTab === tab.key ? 'var(--color-paper)' : 'var(--color-ink-subtle)',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--color-surface)',
                  color:      activeTab === tab.key ? 'var(--color-paper)' : 'var(--color-ink-subtle)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ AMIS ══ */}
      {activeTab === 'friends' && (
        <div className="flex flex-col gap-2.5">
          {friends.length === 0 && (
            <div className="text-center py-16 fade-in">
              <div className="text-5xl mb-4">👥</div>
              <p className="font-serif text-lg font-bold text-ink dark:text-ink-dark mb-1">Aucun ami pour l'instant</p>
              <p className="text-sm text-ink-muted dark:text-ink-subtle mb-4">Trouve des joueurs dans l'onglet "Trouver"</p>
              <button
                onClick={() => setActiveTab('find')}
                className="bg-amber text-black px-5 py-2 rounded-[var(--radius-sm)] text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Trouver des amis
              </button>
            </div>
          )}
          {friends.map(f => (
            <div key={f.id} className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card flex items-center gap-3 hover:shadow-hover transition-all">
              <Link href={`/profile/${f.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar username={f.username} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink dark:text-ink-dark">{f.username}</p>
                  <p className="text-xs text-ink-subtle">Niveau {f.level}</p>
                </div>
              </Link>
              <button
                onClick={() => removeFriend(f.id)}
                className="text-xs text-ink-muted dark:text-ink-subtle hover:text-crimson transition-colors px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-crimson-bg"
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══ DEMANDES ══ */}
      {activeTab === 'requests' && (
        <div className="flex flex-col gap-5">
          {/* Reçues */}
          {pendingReceived.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3">
                Demandes reçues ({pendingReceived.length})
              </p>
              <div className="flex flex-col gap-2.5">
                {pendingReceived.map(r => (
                  <div key={r.id} className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card flex items-center gap-3">
                    <Avatar username={r.requester?.username || '?'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink dark:text-ink-dark">{r.requester?.username}</p>
                      <p className="text-xs text-ink-subtle">Niveau {r.requester?.level}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => acceptRequest(r.id)}
                        className="bg-amber text-black px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => declineRequest(r.id)}
                        className="bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold hover:bg-hover transition-colors"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Envoyées */}
          {pendingSent.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3">
                Demandes envoyées ({pendingSent.length})
              </p>
              <div className="flex flex-col gap-2.5">
                {pendingSent.map(r => (
                  <div key={r.id} className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card flex items-center gap-3">
                    <Avatar username={r.addressee?.username || '?'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink dark:text-ink-dark">{r.addressee?.username}</p>
                      <p className="text-xs text-ink-subtle">En attente…</p>
                    </div>
                    <button
                      onClick={() => cancelRequest(r.id)}
                      className="text-xs text-ink-muted hover:text-crimson transition-colors px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-crimson-bg"
                    >
                      Annuler
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <div className="text-center py-12">
              <p className="font-serif text-lg font-bold text-ink dark:text-ink-dark mb-1">Aucune demande</p>
              <p className="text-sm text-ink-muted dark:text-ink-subtle">Toutes tes demandes d'amis apparaîtront ici</p>
            </div>
          )}
        </div>
      )}

      {/* ══ TROUVER ══ */}
      {activeTab === 'find' && (
        <div>
          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">⌕</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un joueur…"
              autoFocus
              className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-md)] pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20 shadow-card"
            />
            {searching && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin block" />
              </span>
            )}
          </div>

          {searchQuery.length < 2 && (
            <div className="text-center py-10 text-ink-muted dark:text-ink-subtle text-sm">
              Tape au moins 2 caractères pour chercher
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {searchResults.map(user => {
              const status = getFriendshipStatus(user.id)
              return (
                <div key={user.id} className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card flex items-center gap-3 hover:shadow-hover transition-all">
                  <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar username={user.username} />
                    <div>
                      <p className="font-semibold text-ink dark:text-ink-dark">{user.username}</p>
                      <p className="text-xs text-ink-subtle">Niveau {user.level}</p>
                    </div>
                  </Link>
                  <div className="flex-shrink-0">
                    {status === 'friends' && (
                      <span className="text-xs font-semibold text-forest bg-forest-bg px-3 py-1.5 rounded-[var(--radius-sm)]">
                        ✓ Amis
                      </span>
                    )}
                    {status === 'sent' && (
                      <span className="text-xs font-semibold text-ink-subtle bg-surface dark:bg-surface-dark px-3 py-1.5 rounded-[var(--radius-sm)]">
                        En attente…
                      </span>
                    )}
                    {status === 'received' && (
                      <button
                        onClick={() => {
                          const req = pendingReceived.find(r => r.requester_id === user.id)
                          if (req) acceptRequest(req.id)
                        }}
                        className="text-xs font-semibold bg-amber text-black px-3 py-1.5 rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
                      >
                        Accepter
                      </button>
                    )}
                    {status === 'none' && (
                      <button
                        onClick={() => sendRequest(user.id)}
                        className="text-xs font-semibold bg-ink dark:bg-card-dark text-paper dark:text-ink-dark px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-amber hover:text-black transition-colors"
                      >
                        + Ajouter
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}