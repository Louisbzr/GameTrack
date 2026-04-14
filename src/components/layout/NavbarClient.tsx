'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Gamepad2, Search, List, Home, LogOut, User, Settings, ChevronDown, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import NotificationBell from '@/components/NotificationBell'
import { createClient } from '@/lib/supabase/client'

const AVATAR_COLORS: Record<string, string> = {
  forest: '#22c55e', ocean: '#3b82f6', fire: '#f97316',
  violet: '#a855f7', rose: '#ec4899', gold: '#f59e0b',
  ice: '#06b6d4',    slate: '#64748b',
}

const links = [
  { to: '/discover', icon: Home,     label: 'Accueil' },
  { to: '/library',  icon: Gamepad2, label: 'Jeux'    },
  { to: '/lists',    icon: List,     label: 'Listes'  },
]

interface Props {
  username: string
  avatarColor?: string
  avatarUrl?: string | null
  userId: string
}

export default function NavbarClient({ username, avatarColor = 'forest', avatarUrl, userId }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [menuOpen,     setMenuOpen]     = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchGames,  setSearchGames]  = useState<any[]>([])
  const [searchUsers,  setSearchUsers]  = useState<any[]>([])
  const [searching,    setSearching]    = useState(false)
  const menuRef   = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) closeSearch()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [searchOpen])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchInput(q: string) {
    setSearchQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setSearchGames([]); setSearchUsers([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        // Users: requête Supabase directe (même logique que FriendsClient)
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_color, level')
          .ilike('username', `%${q}%`)
          .limit(4)

        // Games: API existante
        const gamesRes = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`).then(r => r.json())

        setSearchUsers(usersData ?? [])
        setSearchGames((gamesRes.results ?? gamesRes.games ?? []).slice(0, 4))
      } catch {}
      setSearching(false)
    }, 300)
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchGames([])
    setSearchUsers([])
  }

  const SEARCH_AVATAR_COLORS: Record<string, string> = {
    forest: '#22c55e', ocean: '#3b82f6', fire: '#f97316',
    violet: '#a855f7', rose: '#ec4899', gold: '#f59e0b',
    ice: '#06b6d4',    slate: '#64748b',
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const color   = AVATAR_COLORS[avatarColor] ?? '#22c55e'
  const initial = (username?.[0] ?? '?').toUpperCase()

  function AvatarBubble({ size = 8 }: { size?: number }) {
    const sz = `${size * 4}px`
    if (avatarUrl) return (
      <img src={avatarUrl} alt={username} className="rounded-full object-cover flex-shrink-0" style={{ width: sz, height: sz }} />
    )
    return (
      <div className="rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{ width: sz, height: sz, backgroundColor: color }}>
        {initial}
      </div>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50" style={{ borderRadius: 0 }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/discover" className="flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-primary neon-text" />
          <span className="font-bold text-xl neon-text hidden sm:block tracking-tight">GameTrack</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, icon: Icon, label }) => {
            const isActive = pathname === to || (to !== '/discover' && pathname.startsWith(to))
            return (
              <Link key={to} href={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            )
          })}

          {/* Search */}
          <div className="relative" ref={searchRef}>
            <button onClick={() => setSearchOpen(v => !v)}
              className={`p-2 rounded-lg transition-colors ${searchOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <Search className="w-4 h-4" />
            </button>

            {searchOpen && (
              <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 rounded-xl border border-border shadow-xl z-50 overflow-hidden"
                style={{ backgroundColor: 'hsl(var(--background))' }}>
                {/* Input */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={e => handleSearchInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') closeSearch() }}
                    placeholder="Jeux, joueurs..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {searching && <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                  {searchQuery && !searching && (
                    <button onClick={() => handleSearchInput('')} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Results */}
                {(searchGames.length > 0 || searchUsers.length > 0) ? (
                  <div className="max-h-80 overflow-y-auto">
                    {/* Users */}
                    {searchUsers.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40">Joueurs</p>
                        {searchUsers.map((u: any) => (
                          <Link key={u.id} href={`/${u.username}`} onClick={closeSearch}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors">
                            {u.avatar_url
                              ? <img src={u.avatar_url} alt={u.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ backgroundColor: SEARCH_AVATAR_COLORS[u.avatar_color] ?? '#22c55e' }}>
                                  {u.username?.[0]?.toUpperCase()}
                                </div>
                            }
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">@{u.username}</p>
                              <p className="text-[10px] text-muted-foreground">Niveau {u.level ?? 1}</p>
                            </div>
                            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    )}
                    {/* Games */}
                    {searchGames.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40">Jeux</p>
                        {searchGames.map((g: any) => (
                          <Link key={g.id} href={`/games/${g.id}`} onClick={closeSearch}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors">
                            <div className="w-8 h-10 rounded-md overflow-hidden flex-shrink-0 bg-secondary">
                              {g.cover_url
                                ? <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-base">🎮</div>
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                              {g.released && <p className="text-[10px] text-muted-foreground">{new Date(g.released).getFullYear()}</p>}
                            </div>
                            <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : searchQuery.length >= 2 && !searching ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun résultat pour "{searchQuery}"</div>
                ) : searchQuery.length === 0 ? (
                  <div className="px-4 py-4 text-center text-xs text-muted-foreground">Tapez au moins 2 caractères</div>
                ) : null}
              </div>
            )}
          </div>

          <ThemeToggle />

          {/* Notification Bell */}
          <NotificationBell userId={userId} />

          {/* User dropdown */}
          <div className="relative ml-1" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-secondary transition-colors">
              <AvatarBubble size={8} />
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-52 rounded-xl border border-border overflow-hidden shadow-xl z-50"
                style={{ backgroundColor: 'hsl(var(--background))' }}>
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <AvatarBubble size={9} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{username}</p>
                      <p className="text-xs text-muted-foreground">Voir le profil</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <Link href="/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                    <User className="w-4 h-4 text-muted-foreground" /> Mon profil
                  </Link>
                  <Link href="/friends" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Amis
                  </Link>
                  <Link href="/settings" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                    <Settings className="w-4 h-4 text-muted-foreground" /> Paramètres
                  </Link>
                </div>
                <div className="border-t border-border py-1">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
                    <LogOut className="w-4 h-4" /> Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}