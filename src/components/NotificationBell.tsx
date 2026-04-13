'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, any>
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  comment:       '💬',
  friend_request:'👥',
  badge:         '🏆',
  xp_milestone:  '⚡',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'À l\'instant'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

interface Props {
  userId: string
}

export default function NotificationBell({ userId }: Props) {
  const [notifs,  setNotifs]  = useState<Notification[]>([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unread = notifs.filter(n => !n.read).length

  // Initial fetch
  useEffect(() => {
    async function fetchNotifs() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      setNotifs(data || [])
      setLoading(false)
    }
    fetchNotifs()
  }, [userId])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifs(prev => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all relative"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-80 rounded-xl shadow-xl border border-border overflow-hidden z-50"
          style={{ maxHeight: '440px', backgroundColor: 'hsl(var(--background))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-bold text-sm text-foreground">
              Notifications
              {unread > 0 && (
                <span className="ml-2 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                  {unread}
                </span>
              )}
            </h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-primary font-semibold hover:underline"
              >
                Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            {loading && (
              <div className="flex items-center justify-center py-10">
                <span className="w-5 h-5 border-2 border-amber border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <p className="text-sm font-semibold text-foreground mb-1">Aucune notification</p>
                <p className="text-xs text-muted-foreground">Tu seras notifié des commentaires, badges et progressions</p>
              </div>
            )}

            {notifs.map(n => (
              <div
                key={n.id}
                className="flex flex-col px-4 py-3 border-b border-border last:border-0 transition-colors"
                style={{ background: !n.read ? 'hsl(var(--primary) / 0.07)' : undefined }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5 bg-secondary">
                    {TYPE_ICON[n.type] || '📬'}
                  </div>

                  {/* Content */}
                  <button className="flex-1 min-w-0 text-left" onClick={() => markRead(n.id)}>
                    <p className="text-[13px] font-semibold text-foreground leading-tight mb-0.5 font-semibold">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-muted-foreground leading-tight text-[11px]">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </button>

                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                </div>

                {/* Boutons d'action pour les demandes d'amis */}
                {n.type === 'friend_request' && n.data?.friendship_id && (
                  <div className="flex gap-2 mt-2.5 ml-11">
                    <button
                      onClick={async () => {
                        await fetch('/api/friends/accept', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ friendshipId: n.data.friendship_id }),
                        })
                        markRead(n.id)
                        setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, data: { ...x.data, friendship_id: null } } : x))
                      }}
                      className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={async () => {
                        await fetch('/api/friends/decline', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ friendshipId: n.data.friendship_id }),
                        })
                        markRead(n.id)
                        setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, data: { ...x.data, friendship_id: null } } : x))
                      }}
                      className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Refuser
                    </button>
                  </div>
                )}

                {/* Lien vers /friends si pas de friendship_id direct */}
                {n.type === 'friend_request' && !n.data?.friendship_id && (
                  <a href="/friends" onClick={() => markRead(n.id)}
                    className="ml-11 mt-2 text-[11px] font-semibold text-primary hover:underline">
                    Voir dans Amis →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}