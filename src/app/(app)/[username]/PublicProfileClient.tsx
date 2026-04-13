'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Gamepad2, MessageSquare, Users, Trophy, Zap, Heart, Star,
  BarChart3, UserPlus, UserCheck, Clock, Target,
  PenLine, Shield, BookOpen, Crown, Library, Check, Lock
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

const ALL_BADGES = [
  { slug: 'first_blood',    lucide: 'Gamepad2', name: 'Premier Pas',     desc: 'Jouer à votre premier jeu',  xp: 50,   rarity: 'common'    },
  { slug: 'critic',         lucide: 'PenLine',  name: 'Critique Novice', desc: 'Écrire votre premier avis',  xp: 50,   rarity: 'common'    },
  { slug: 'veteran',        lucide: 'Shield',   name: 'Centurion',       desc: 'Jouer à 100 jeux',           xp: 500,  rarity: 'rare'      },
  { slug: 'on_fire',        lucide: 'BookOpen', name: "Plume d'Or",      desc: 'Écrire 50 avis',             xp: 300,  rarity: 'rare'      },
  { slug: 'legend',         lucide: 'Star',     name: 'Influenceur',     desc: 'Avoir 1000 abonnés',         xp: 500,  rarity: 'rare'      },
  { slug: 'marathonien',    lucide: 'Zap',      name: 'Marathonien',     desc: 'Jouer à 500 jeux',           xp: 1000, rarity: 'epic'      },
  { slug: 'legende_rank',   lucide: 'Crown',    name: 'Légende',         desc: 'Atteindre le niveau 20',     xp: 2000, rarity: 'legendary' },
  { slug: 'sociable',       lucide: 'Users',    name: 'Sociable',        desc: 'Suivre 200 personnes',       xp: 200,  rarity: 'rare'      },
  { slug: 'connaisseur',    lucide: 'Target',   name: 'Connaisseur',     desc: 'Noter 200 jeux',             xp: 750,  rarity: 'epic'      },
  { slug: 'collectionneur', lucide: 'Library',  name: 'Collectionneur',  desc: 'Créer 20 listes',            xp: 300,  rarity: 'rare'      },
]

const AVATAR_COLORS: Record<string, string> = {
  forest: '#22c55e', ocean: '#3b82f6', fire: '#f97316',
  violet: '#a855f7', rose: '#ec4899', gold: '#f59e0b',
  ice: '#06b6d4', slate: '#64748b',
}

const BANNER_GRADIENTS: Record<string, string> = {
  green:  'linear-gradient(135deg, #064e3b, #052e16)',
  blue:   'linear-gradient(135deg, #1e3a5f, #0f172a)',
  purple: 'linear-gradient(135deg, #3b0764, #1e1b4b)',
  orange: 'linear-gradient(135deg, #7c2d12, #1c1917)',
  rose:   'linear-gradient(135deg, #881337, #1c1917)',
  slate:  'linear-gradient(135deg, #1e293b, #0f172a)',
  teal:   'linear-gradient(135deg, #134e4a, #052e16)',
  indigo: 'linear-gradient(135deg, #312e81, #1e1b4b)',
}

const RARITY_BORDER: Record<string, string> = {
  common: 'border-border', rare: 'border-blue-500/40',
  epic: 'border-purple-500/40', legendary: 'border-yellow-500/40'
}
const RARITY_TEXT: Record<string, string> = {
  common: 'text-muted-foreground', rare: 'text-blue-400',
  epic: 'text-purple-400', legendary: 'text-yellow-400'
}
const CHART_COLORS = ['hsl(142,70%,49%)','hsl(270,60%,60%)','hsl(200,80%,55%)','hsl(35,100%,55%)','hsl(330,60%,60%)','hsl(180,100%,50%)']

interface Props {
  profile: any
  library: any[]
  reviews?: any[]
  badges: any[]
  stats: { total: number; completed: number; playing: number; avgRating: string }
  viewerId: string | null
  isFriend: boolean
  hasPendingRequest: boolean
  targetUserId: string
  privacySettings?: { profilePublic: boolean; showGameList: boolean; showStats: boolean; showActivity: boolean }
}

function BadgeIcon({ lucide, className }: { lucide: string; className: string }) {
  if (lucide === 'Gamepad2') return <Gamepad2 className={className} />
  if (lucide === 'PenLine')  return <PenLine  className={className} />
  if (lucide === 'Shield')   return <Shield   className={className} />
  if (lucide === 'BookOpen') return <BookOpen className={className} />
  if (lucide === 'Star')     return <Star     className={className} />
  if (lucide === 'Zap')      return <Zap      className={className} />
  if (lucide === 'Crown')    return <Crown    className={className} />
  if (lucide === 'Users')    return <Users    className={className} />
  if (lucide === 'Target')   return <Target   className={className} />
  if (lucide === 'Library')  return <Library  className={className} />
  return null
}

export default function PublicProfileClient({
  profile, library, reviews = [], badges, stats, viewerId, isFriend, hasPendingRequest, targetUserId, privacySettings
}: Props) {
  const privacy = privacySettings ?? { profilePublic: true, showGameList: true, showStats: true, showActivity: true }
  const isOwner = viewerId === targetUserId
  const canView = isOwner || isFriend || privacy.profilePublic

  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>(
    isFriend ? 'friends' : hasPendingRequest ? 'pending' : 'none'
  )
  const [activeTab, setActiveTab] = useState<'jeux' | 'avis' | 'stats' | 'succes'>('jeux')

  const router   = useRouter()
  const supabase = createClient()

  const unlockedSlugs = new Set(badges.map((b: any) => b.badge_slug))
  const username    = profile?.username || 'Joueur'
  const level       = profile?.level    || 1
  const xp          = profile?.xp       || 0
  const xpNeeded    = level * 200
  const xpPercent   = Math.round(((xp % xpNeeded) / xpNeeded) * 100)
  const avatarColor = AVATAR_COLORS[profile?.avatar_color] ?? '#22c55e'
  const bannerGrad  = BANNER_GRADIENTS[profile?.banner_gradient ?? 'green'] ?? BANNER_GRADIENTS.green

  const userReviews = library.filter((l: any) => l.review).slice(0, 4)
  const favGames    = library.filter((l: any) => l.is_favorite && l.games?.cover_url).slice(0, 8)

  const genreCount: Record<string, number> = {}
  library.forEach((l: any) => { (l.games?.genres ?? []).forEach((g: string) => { genreCount[g] = (genreCount[g] || 0) + 1 }) })
  const genreData = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
  const statusData = [
    { name: 'Terminés',   value: library.filter((l: any) => l.status === 'completed').length },
    { name: 'En cours',   value: library.filter((l: any) => l.status === 'playing').length },
    { name: 'A faire',    value: library.filter((l: any) => l.status === 'backlog').length },
    { name: 'Abandonnés', value: library.filter((l: any) => l.status === 'dropped').length },
  ].filter(d => d.value > 0)

  async function sendFriendRequest() {
    if (!viewerId) { router.push('/login'); return }
    await supabase.from('friendships').insert({ requester_id: viewerId, addressee_id: targetUserId, status: 'pending' })
    setFriendStatus('pending')
  }
  async function removeFriend() {
    if (!viewerId) return
    await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${viewerId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${viewerId})`)
    setFriendStatus('none')
  }

  if (!canView) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center glass rounded-2xl p-10 max-w-sm mx-auto border border-border space-y-4">
        <Lock className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Profil privé</h2>
          <p className="text-muted-foreground text-sm">Ce profil n'est visible que par ses amis.</p>
        </div>
        {viewerId && friendStatus === 'none' && (
          <button onClick={sendFriendRequest}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity mx-auto">
            <UserPlus className="w-4 h-4" /> Ajouter en ami
          </button>
        )}
        {viewerId && friendStatus === 'pending' && (
          <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-sm text-muted-foreground mx-auto justify-center">
            <Clock className="w-4 h-4" /> Demande envoyée
          </span>
        )}
        {!viewerId && (
          <a href="/login" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity mx-auto justify-center">
            Se connecter pour ajouter en ami
          </a>
        )}
      </div>
    </div>
  )

  const TABS = [
    { id: 'jeux',    label: 'Jeux',         icon: Gamepad2      },
    { id: 'avis',    label: `Avis (${reviews.length})`, icon: MessageSquare },
    { id: 'stats',   label: 'Statistiques', icon: BarChart3     },
    { id: 'succes',  label: 'Succes',       icon: Trophy        },
  ] as const

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="relative h-48 overflow-hidden"
        style={{ background: profile?.banner_url ? undefined : bannerGrad }}>
        {profile?.banner_url && <img src={profile.banner_url} alt="Banniere" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-16">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-8">
          <div className="relative flex-shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={username} className="w-28 h-28 rounded-full object-cover ring-4 ring-background shadow-xl" />
              : <div className="w-28 h-28 rounded-full flex items-center justify-center font-bold text-white text-3xl ring-4 ring-background shadow-xl"
                  style={{ backgroundColor: avatarColor }}>
                  {username.slice(0, 2).toUpperCase()}
                </div>
            }
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-background">
              {level}
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-foreground">{username}</h1>
            <p className="text-sm text-primary font-medium">@{username}</p>
            {profile?.bio && <p className="text-sm text-muted-foreground mt-1 max-w-md">{profile.bio}</p>}
          </div>
          {!isOwner && viewerId && (
            <div className="flex-shrink-0">
              {friendStatus === 'friends' && (
                <button onClick={removeFriend} className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-sm font-semibold text-primary hover:text-red-400 transition-colors">
                  <UserCheck className="w-4 h-4" /> Amis
                </button>
              )}
              {friendStatus === 'pending' && (
                <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-sm font-medium text-muted-foreground">
                  <Clock className="w-4 h-4" /> Demande envoyee
                </span>
              )}
              {friendStatus === 'none' && (
                <button onClick={sendFriendRequest} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                  <UserPlus className="w-4 h-4" /> Ajouter
                </button>
              )}
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-5 mb-8 neon-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">Niveau {level}</span>
            </div>
            <span className="text-sm text-muted-foreground">{xp.toLocaleString()} XP total</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${xpPercent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{xp % xpNeeded} / {xpNeeded} XP pour le niveau {level + 1}</p>
        </div>

        {(isOwner || privacy.showStats) && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { icon: Gamepad2,      label: 'Joues',    value: stats.total },
              { icon: MessageSquare, label: 'Avis',     value: reviews.length },
              { icon: Heart,         label: 'Favoris',  value: favGames.length },
              { icon: Trophy,        label: 'Termines', value: stats.completed },
              { icon: Star,          label: 'Note moy', value: stats.avgRating },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass rounded-xl p-4 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-bold text-xl text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto bg-secondary/40 border border-border p-1 rounded-xl mb-6 no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'jeux' && (
          <div className="space-y-10">
            {favGames.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400 fill-red-400" /> Jeux favoris
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                  {favGames.map((item: any) => {
                    const g = item.games
                    return (
                      <a key={item.id} href={`/games/${g?.id}`} className="game-card-hover group block">
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary">
                          {g?.cover_url
                            ? <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
                          }
                        </div>
                        <p className="font-semibold text-[11px] text-foreground group-hover:text-primary transition-colors truncate mt-1.5">{g?.name}</p>
                      </a>
                    )
                  })}
                </div>
              </section>
            )}

            {(isOwner || privacy.showGameList) && (
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" /> Bibliotheque recente
                </h2>
                {library.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center text-muted-foreground">
                    <Gamepad2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Aucun jeu dans la bibliotheque</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {library.slice(0, 10).map((item: any) => (
                      <a key={item.id} href={`/games/${item.games?.id}`}
                        className="glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-colors">
                        <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                          {item.games?.cover_url
                            ? <img src={item.games.cover_url} alt={item.games.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">🎮</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{item.games?.name}</p>
                          <p className="text-xs text-muted-foreground">{
                            item.status === 'completed' ? 'Termine' :
                            item.status === 'playing' ? 'En cours' :
                            item.status === 'backlog' ? 'A jouer' : 'Abandonne'
                          }</p>
                          {item.rating && (
                            <div className="flex gap-0.5 mt-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < Math.round(item.rating) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            )}

            {userReviews.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" /> Avis recents
                </h2>
                <div className="space-y-3">
                  {userReviews.map((item: any) => (
                    <div key={item.id} className="glass rounded-xl p-4 flex gap-3">
                      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                        {item.games?.cover_url
                          ? <img src={item.games.cover_url} alt={item.games.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">🎮</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{item.games?.name}</p>
                        {item.rating && (
                          <div className="flex gap-0.5 my-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < Math.round(item.rating) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.review}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'avis' && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Aucun avis pour l'instant</p>
              </div>
            ) : (
              reviews.map((item: any) => (
                <a key={item.id} href={`/games/${item.games?.id}`}
                  className="glass rounded-xl p-4 flex gap-4 hover:border-primary/40 transition-colors block">
                  <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                    {item.games?.cover_url
                      ? <img src={item.games.cover_url} alt={item.games.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground mb-1">{item.games?.name}</p>
                    {item.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.round(item.rating) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{Number(item.rating).toFixed(1)}/5</span>
                      </div>
                    )}
                    {item.review && <p className="text-sm text-muted-foreground leading-relaxed">{item.review}</p>}
                    {!item.review && item.rating && <p className="text-xs text-muted-foreground italic">Note sans avis ecrit</p>}
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && (isOwner || privacy.showStats) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statusData.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Repartition par statut</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                      {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {genreData.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Genres favoris</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={genreData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(142,70%,49%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'succes' && (
          <div className="space-y-6">
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Progression globale</span>
                <span className="text-sm text-primary font-bold">{unlockedSlugs.size}/{ALL_BADGES.length}</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(unlockedSlugs.size / ALL_BADGES.length) * 100}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {ALL_BADGES.map(badge => {
                const unlocked = unlockedSlugs.has(badge.slug)
                return (
                  <div key={badge.slug} className={`relative rounded-xl border transition-all overflow-hidden ${unlocked ? RARITY_BORDER[badge.rarity] : 'border-border/40 opacity-50'}`}
                    style={{ background: unlocked ? undefined : 'hsl(var(--secondary)/0.3)' }}>
                    {unlocked && <div className={`absolute inset-0 opacity-5 ${badge.rarity === 'legendary' ? 'bg-yellow-400' : badge.rarity === 'epic' ? 'bg-purple-400' : badge.rarity === 'rare' ? 'bg-blue-400' : 'bg-primary'}`} />}
                    <div className="relative p-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${unlocked ? badge.rarity === 'legendary' ? 'bg-yellow-400/15' : badge.rarity === 'epic' ? 'bg-purple-400/15' : badge.rarity === 'rare' ? 'bg-blue-400/15' : 'bg-primary/15' : 'bg-secondary/50'}`}>
                        <BadgeIcon lucide={badge.lucide} className={`w-4 h-4 ${unlocked ? RARITY_TEXT[badge.rarity] : 'text-muted-foreground'}`} />
                      </div>
                      <p className={`font-semibold text-xs leading-tight ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{badge.name}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">{badge.desc}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${RARITY_TEXT[badge.rarity]}`}>{badge.rarity}</span>
                        <span className="text-[9px] text-primary font-bold flex items-center gap-0.5"><Zap className="w-2 h-2" />+{badge.xp}</span>
                      </div>
                      {unlocked && <div className="absolute top-2 right-2"><div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div></div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}