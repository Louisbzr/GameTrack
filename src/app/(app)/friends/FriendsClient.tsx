'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Users, UserPlus, UserMinus, MessageSquare, Gamepad2,
  Trophy, Clock, Search, Check, X, Star
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Friend {
  id: string
  username: string
  level: number
  avatar_color?: string
  avatar_url?: string | null
}

interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  requester: Friend | null
  addressee: Friend | null
}

interface ActivityItem {
  id: string
  user_id: string
  username: string
  avatar_color?: string
  avatar_url?: string | null
  type: 'added' | 'reviewed' | 'completed' | 'started'
  game_id: string
  game_name: string
  game_cover: string | null
  rating?: number
  created_at: string
}

interface Props {
  userId: string
  friends: Friend[]
  pendingReceived: FriendRequest[]
  pendingSent: FriendRequest[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  forest: '#22c55e', ocean: '#3b82f6', fire: '#f97316',
  violet: '#a855f7', rose:  '#ec4899', gold: '#f59e0b',
  ice:    '#06b6d4', slate: '#64748b',
}

const ACTIVITY_LABEL: Record<string, string> = {
  added:     'a ajouté',
  reviewed:  'a noté',
  completed: 'a terminé',
  started:   'a commencé',
}

const ACTIVITY_ICON: Record<string, any> = {
  added:     Gamepad2,
  reviewed:  Star,
  completed: Trophy,
  started:   Gamepad2,
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'À l\'instant'
  if (m < 60) return `Il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h}h`
  return `Il y a ${Math.floor(h / 24)}j`
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function AvatarBubble({ user, size = 10 }: { user: Friend; size?: number }) {
  const sz = `${size * 4}px`
  if (user.avatar_url) return (
    <img src={user.avatar_url} alt={user.username}
      className="rounded-full object-cover flex-shrink-0 ring-2 ring-border"
      style={{ width: sz, height: sz }} />
  )
  const color = AVATAR_COLORS[user.avatar_color ?? 'forest'] ?? '#22c55e'
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ring-2 ring-border"
      style={{ width: sz, height: sz, backgroundColor: color, fontSize: size > 10 ? '0.9rem' : '0.7rem' }}>
      {user.username.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FriendsClient({ userId, friends: initialFriends, pendingReceived: initialReceived, pendingSent: initialSent }: Props) {
  const supabase = createClient()

  const [friends,         setFriends]         = useState<Friend[]>(initialFriends)
  const [pendingReceived, setPendingReceived]  = useState<FriendRequest[]>(initialReceived)
  const [pendingSent,     setPendingSent]      = useState<FriendRequest[]>(initialSent)
  const [searchQuery,     setSearchQuery]      = useState('')
  const [searchResults,   setSearchResults]    = useState<Friend[]>([])
  const [searching,       setSearching]        = useState(false)
  const [activity,        setActivity]         = useState<ActivityItem[]>([])
  const [activityLoaded,  setActivityLoaded]   = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load friends' activity from library
  useEffect(() => {
    if (friends.length === 0) { setActivityLoaded(true); return }
    const friendIds = friends.map(f => f.id)
    supabase
      .from('library')
      .select('id, user_id, status, rating, review, updated_at, games(id, name, cover_url), profiles(username, avatar_color, avatar_url)')
      .in('user_id', friendIds)
      .order('updated_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const items: ActivityItem[] = (data ?? []).map((r: any) => ({
          id:          r.id,
          user_id:     r.user_id,
          username:    r.profiles?.username ?? 'Joueur',
          avatar_color: r.profiles?.avatar_color,
          avatar_url:  r.profiles?.avatar_url,
          type:        r.rating || r.review ? 'reviewed' : r.status === 'completed' ? 'completed' : r.status === 'playing' ? 'started' : 'added',
          game_id:     r.games?.id,
          game_name:   r.games?.name ?? '?',
          game_cover:  r.games?.cover_url,
          rating:      r.rating,
          created_at:  r.updated_at,
        }))
        setActivity(items)
        setActivityLoaded(true)
      })
  }, [friends])

  // Search users
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    if (timeout.current) clearTimeout(timeout.current)
    setSearching(true)
    timeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, level, avatar_color, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', userId)
        .limit(10)
      setSearchResults(data || [])
      setSearching(false)
    }, 350)
  }, [searchQuery])

  function getFriendshipStatus(targetId: string): 'none' | 'friends' | 'sent' | 'received' {
    if (friends.some(f => f.id === targetId)) return 'friends'
    if (pendingSent.some(r => r.addressee_id === targetId)) return 'sent'
    if (pendingReceived.some(r => r.requester_id === targetId)) return 'received'
    return 'none'
  }

  async function sendRequest(targetId: string) {
    const { data } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: targetId, status: 'pending' })
      .select('*, requester:profiles!friendships_requester_id_fkey(id,username,level,avatar_color,avatar_url), addressee:profiles!friendships_addressee_id_fkey(id,username,level,avatar_color,avatar_url)')
      .single()
    if (data) setPendingSent(prev => [...prev, data])
  }

  async function acceptRequest(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    const req = pendingReceived.find(r => r.id === friendshipId)
    if (req?.requester) {
      setFriends(prev => [...prev, req.requester as Friend])
      setPendingReceived(prev => prev.filter(r => r.id !== friendshipId))
    }
  }

  async function declineRequest(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setPendingReceived(prev => prev.filter(r => r.id !== friendshipId))
  }

  async function removeFriend(friendId: string) {
    await supabase.from('friendships')
      .delete()
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
    setFriends(prev => prev.filter(f => f.id !== friendId))
  }

  async function cancelRequest(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setPendingSent(prev => prev.filter(r => r.id !== friendshipId))
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">Amis & Activité</h1>
          <p className="text-muted-foreground text-sm">Suivez vos amis et leur activité gaming.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Friends list ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Chercher un joueur…"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Search results */}
            {searchQuery.length >= 2 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Résultats</p>
                {searchResults.length === 0 && !searching && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun joueur trouvé</p>
                )}
                {searchResults.map(user => {
                  const status = getFriendshipStatus(user.id)
                  return (
                    <div key={user.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <AvatarBubble user={user} size={9} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground">Niv. {user.level}</p>
                      </div>
                      {status === 'friends' && (
                        <span className="text-xs text-primary font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Amis</span>
                      )}
                      {status === 'sent' && (
                        <span className="text-xs text-muted-foreground">En attente…</span>
                      )}
                      {status === 'received' && (
                        <button onClick={() => { const req = pendingReceived.find(r => r.requester_id === user.id); if (req) acceptRequest(req.id) }}
                          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-semibold hover:opacity-90">
                          Accepter
                        </button>
                      )}
                      {status === 'none' && (
                        <button onClick={() => sendRequest(user.id)}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pending received */}
            {pendingReceived.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                  Demandes reçues
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingReceived.length}</span>
                </p>
                {pendingReceived.map(req => {
                  const user = req.requester
                  if (!user) return null
                  return (
                    <div key={req.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <AvatarBubble user={user} size={9} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground">Niv. {user.level}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => acceptRequest(req.id)}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => declineRequest(req.id)}
                          className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Friends list */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Mes amis ({friends.length})
              </p>
              {friends.length === 0 && (
                <div className="glass rounded-xl p-6 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Cherchez des joueurs ci-dessus</p>
                </div>
              )}
              {friends.map(friend => (
                <div key={friend.id} className="glass rounded-xl p-3 flex items-center gap-3 group">
                  <AvatarBubble user={friend} size={9} />
                  <Link href={`/${friend.username}`} className="flex-1 min-w-0 hover:text-primary transition-colors">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary">{friend.username}</p>
                    <p className="text-xs text-muted-foreground">Niv. {friend.level}</p>
                  </Link>
                  <button onClick={() => removeFriend(friend.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Pending sent */}
              {pendingSent.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-4">Envoyées</p>
                  {pendingSent.map(req => {
                    const user = req.addressee
                    if (!user) return null
                    return (
                      <div key={req.id} className="glass rounded-xl p-3 flex items-center gap-3 opacity-60">
                        <AvatarBubble user={user} size={9} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{user.username}</p>
                          <p className="text-xs text-muted-foreground">En attente…</p>
                        </div>
                        <button onClick={() => cancelRequest(req.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT: Activity feed ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Fil d'activité
            </p>

            {!activityLoaded && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {activityLoaded && activity.length === 0 && (
              <div className="glass rounded-xl p-10 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Aucune activité récente</p>
                <p className="text-sm mt-1">L'activité de vos amis apparaîtra ici.</p>
              </div>
            )}

            <div className="space-y-3">
              {activity.map(item => {
                const Icon = ACTIVITY_ICON[item.type] ?? Gamepad2
                const friend = friends.find(f => f.id === item.user_id) ?? { id: item.user_id, username: item.username, level: 1, avatar_color: item.avatar_color, avatar_url: item.avatar_url }
                return (
                  <div key={item.id} className="glass rounded-xl p-4">
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <AvatarBubble user={friend} size={10} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <Link href={`/${item.username}`} className="font-bold hover:text-primary transition-colors">{item.username}</Link>
                          {' '}
                          <span className="text-muted-foreground">{ACTIVITY_LABEL[item.type] ?? 'a interagi avec'}</span>
                        </p>

                        {/* Game */}
                        <Link href={`/games/${item.game_id}`} className="flex items-center gap-3 mt-2 group">
                          <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                            {item.game_cover
                              ? <img src={item.game_cover} alt={item.game_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              : <div className="w-full h-full flex items-center justify-center text-lg">🎮</div>
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{item.game_name}</p>
                            {item.rating && (
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < Math.round(item.rating!) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                                ))}
                                <span className="text-xs text-primary ml-1 font-semibold">{item.rating}/5</span>
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Time + type */}
                        <div className="flex items-center gap-2 mt-2">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[11px] text-muted-foreground">{timeAgo(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}