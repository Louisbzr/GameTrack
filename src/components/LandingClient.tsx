'use client'

import Link from 'next/link'
import { Gamepad2, Library, Compass, Users, Star, Trophy, ChevronRight, ArrowRight, Check, Zap, Crown, Shield, PenLine, Target } from 'lucide-react'

const GAME_COVERS = [
  { title: 'Elden Ring',            appid: 1245620 },
  { title: 'Hollow Knight',         appid: 367520  },
  { title: 'Hades',                 appid: 1145360 },
  { title: 'Celeste',               appid: 504230  },
  { title: 'The Witcher 3',         appid: 292030  },
  { title: 'Cyberpunk 2077',        appid: 1091500 },
  { title: 'Red Dead Redemption 2', appid: 1174180 },
  { title: 'Dark Souls III',        appid: 374320  },
  { title: "Baldur's Gate 3",       appid: 1086940 },
  { title: 'Stardew Valley',        appid: 413150  },
  { title: 'God of War',            appid: 1593500 },
  { title: 'Disco Elysium',         appid: 632470  },
]

function coverUrl(appid: number) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`
}

// Image bannière large (format hero paysage Steam 3840×1240)
const BANNER_URL = 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/library_hero.jpg'

const FEATURES = [
  { icon: Library, title: 'Ta bibliothèque, organisée',   desc: 'Ajoute tes jeux, suis ta progression, marque les terminés, en cours ou abandonnés.', color: 'text-green-400',  bg: 'bg-green-400/10'  },
  { icon: Compass, title: 'Découvre de nouveaux jeux',    desc: 'Sorties de la semaine, recommandations par genre, tendances communautaires.',        color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  { icon: Users,   title: 'Le social gaming',             desc: "Suis tes amis, lis leurs avis, partage les tiens. Un fil d'actu dédié à ta communauté.", color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { icon: Trophy,  title: 'Progression & récompenses',    desc: 'XP, niveaux, badges, quêtes quotidiennes. Tracker devient lui-même un jeu.',          color: 'text-amber-400',  bg: 'bg-amber-400/10'  },
]

const TESTIMONIALS = [
  { username: 'darksouls_enjoyer', color: '#a855f7', text: "Enfin un Letterboxd pour les jeux. La page découverte m'a fait trouver des indés incroyables.", games: 142 },
  { username: 'retro_marie',       color: '#ec4899', text: "J'adore voir ce que mes amis jouent en temps réel. Le fil d'actu remplace mon discord gaming.",  games: 87  },
  { username: 'speedrun_alex',     color: '#f97316', text: "Les quêtes quotidiennes me donnent une vraie raison de tracker chaque jour.",                      games: 231 },
]

const PROFILE_GAMES = [
  { appid: 1245620, status: 'completed', rating: 5    },
  { appid: 1145360, status: 'completed', rating: 5    },
  { appid: 1086940, status: 'playing',   rating: null },
  { appid: 367520,  status: 'completed', rating: 4    },
  { appid: 504230,  status: 'completed', rating: 5    },
  { appid: 1091500, status: 'abandoned', rating: 3    },
]

const STATUS_COLOR: Record<string, string> = {
  completed: '#22c55e',
  playing:   '#3b82f6',
  abandoned: '#ef4444',
}

const BADGES = [
  { icon: Shield,  color: '#3b82f6' },
  { icon: PenLine, color: '#3b82f6' },
  { icon: Zap,     color: '#a855f7' },
  { icon: Crown,   color: '#f59e0b' },
  { icon: Target,  color: '#a855f7' },
]

interface Props {
  stats?: { games: number; library: number; reviews: number; users: number }
}

export default function LandingClient({ stats }: Props) {
  const s = stats ?? { games: 1200, library: 14000, reviews: 2800, users: 480 }

  function fmt(n: number) {
    if (n >= 10000) return `${Math.round(n / 1000)}k+`
    if (n >= 1000)  return `${(n / 1000).toFixed(1).replace('.0', '')}k+`
    return `${n}+`
  }

  const statItems = [
    { value: fmt(s.games),   label: 'Jeux référencés'         },
    { value: fmt(s.library), label: 'Entrées en bibliothèque' },
    { value: fmt(s.reviews), label: 'Avis partagés'           },
    { value: fmt(s.users),   label: 'Joueurs actifs'          },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40"
        style={{ backgroundColor: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-primary" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6))' }} />
            <span className="font-bold text-xl tracking-tight"
              style={{ color: 'hsl(var(--primary))', textShadow: '0 0 20px hsl(var(--primary) / 0.4)' }}>
              Backlogg
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Connexion
            </Link>
            <Link href="/register"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'hsl(var(--primary))' }}>
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
        </div>
        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              <Star className="w-3 h-3" />
              Ta critique pour les jeux vidéo
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
              <span className="text-foreground">Tracke ta passion</span>
              <br />
              <span style={{ color: 'hsl(var(--primary))', textShadow: '0 0 40px hsl(var(--primary) / 0.4)' }}>
                pour les jeux
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Bibliothèque personnelle, découverte, avis communautaires et gamification.
              Rejoins la communauté de joueurs qui tient à jour son backlog.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/register"
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-primary-foreground hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
                style={{ backgroundColor: 'hsl(var(--primary))', boxShadow: '0 0 30px hsl(var(--primary) / 0.4)' }}>
                Commencer 
              </Link>
              <Link href="/login"
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground transition-colors border border-border">
                Déjà membre ? 
              </Link>
            </div>
          </div>

          {/* Covers strip */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }} />
            <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }} />
            <div className="flex gap-4 overflow-hidden">
              {[...GAME_COVERS, ...GAME_COVERS].map((game, i) => (
                <div key={i}
                  className="flex-shrink-0 w-[110px] h-[148px] rounded-xl overflow-hidden relative group cursor-default border border-white/5">
                  <img src={coverUrl(game.appid)} alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 55%)' }} />
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-12 border-y border-border/40" style={{ backgroundColor: 'hsl(var(--card))' }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-center">
            {statItems.map((item) => (
              <div key={item.label}>
                <p className="text-3xl font-extrabold" style={{ color: 'hsl(var(--primary))' }}>{item.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Tout ce dont un joueur a besoin</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Backlogg centralise ce que tu faisais avec des dizaines d'apps différentes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-border/50 hover:border-border transition-colors group"
                style={{ backgroundColor: 'hsl(var(--card))' }}>
                <div className={`inline-flex p-3 rounded-xl ${f.bg} mb-4`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROFILE MOCKUP ── */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-foreground">Ton profil, ta vitrine</h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto text-sm">
              Stats détaillées, historique de jeux, badges et avis, tout visible en un coup d'œil.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-border/50 relative select-none"
            style={{ backgroundColor: 'hsl(220 20% 8%)' }}>

            {/* Fake navbar */}
            <div className="flex items-center gap-4 px-6 py-3.5 border-b border-border/40 text-xs"
              style={{ backgroundColor: 'hsl(220 20% 6% / 0.9)' }}>
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-primary" />
                <span className="font-bold text-primary/80">Backlogg</span>
              </div>
              {['Accueil', 'Jeux', 'Listes'].map(l => (
                <span key={l} className="text-muted-foreground/60 px-2 py-1 cursor-default">{l}</span>
              ))}
              <div className="ml-auto w-7 h-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-[10px] font-bold text-green-400">L</div>
            </div>

            {/* ── BANNIÈRE : une seule image hero plein-largeur ── */}
            <div className="h-32 relative overflow-hidden">
              <img
                src={BANNER_URL}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{ filter: 'brightness(0.6)' }}
              />
              {/* Dégradé bas pour transition douce vers le contenu */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 40%, hsl(220 20% 8%) 100%)' }} />
            </div>

            {/* Profile content */}
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-10 mb-5">
                <div className="flex items-end gap-4">
                  {/* Avatar chevauchant la bannière */}
                  <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-extrabold text-white shadow-xl flex-shrink-0 relative z-10"
                    style={{ backgroundColor: '#22c55e', borderColor: 'hsl(220 20% 8%)' }}>
                    L
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-foreground">louisgaming</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-amber-400 border border-amber-400/30 bg-amber-400/10">Niv. 12</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Membre depuis mars 2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border/40 text-muted-foreground bg-secondary/20 cursor-default">
                  <Users className="w-3 h-3" /> 24 amis
                </div>
              </div>

              {/* XP bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">4 250 XP</span>
                  <span className="text-[10px] text-muted-foreground">Niv. 13 → 5 000 XP</span>
                </div>
                <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: '85%', boxShadow: '0 0 8px hsl(var(--primary) / 0.6)' }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { val: '67',  label: 'Jeux',    color: 'hsl(var(--primary))' },
                  { val: '34',  label: 'Terminés', color: '#22c55e'             },
                  { val: '8',   label: 'En cours', color: '#3b82f6'             },
                  { val: '4.2', label: 'Moy. /5',  color: '#f59e0b'             },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 border border-border/30"
                    style={{ backgroundColor: 'hsl(220 20% 6%)' }}>
                    <p className="text-xl font-extrabold" style={{ color: s.color }}>{s.val}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Badges */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Badges obtenus</p>
                <div className="flex items-center gap-2">
                  {BADGES.map((b, i) => (
                    <div key={i} className="w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: b.color + '15', borderColor: b.color + '40' }}>
                      <b.icon className="w-4 h-4" style={{ color: b.color }} />
                    </div>
                  ))}
                  <div className="w-9 h-9 rounded-xl border border-border/30 flex items-center justify-center text-[10px] text-muted-foreground cursor-default"
                    style={{ backgroundColor: 'hsl(220 20% 6%)' }}>+3</div>
                </div>
              </div>

              {/* Recent games */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Bibliothèque récente</p>
                <div className="grid grid-cols-6 gap-2">
                  {PROFILE_GAMES.map((g, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-white/5 group cursor-default"
                      style={{ aspectRatio: '2/3' }}>
                      <img src={coverUrl(g.appid)} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-black/40"
                        style={{ backgroundColor: STATUS_COLOR[g.status] ?? '#666' }} />
                      {g.rating && (
                        <div className="absolute bottom-0 left-0 right-0 py-1 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                          <div className="flex gap-px">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star key={j} className="w-2 h-2"
                                style={{ color: j < g.rating! ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}
                                fill={j < g.rating! ? '#f59e0b' : 'none'} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fade bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))' }} />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-4" style={{ backgroundColor: 'hsl(var(--card) / 0.5)' }}>
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-foreground mb-12">Ce qu'en disent les joueurs</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.username} className="p-6 rounded-2xl border border-border/50 space-y-4"
                style={{ backgroundColor: 'hsl(var(--card))' }}>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: t.color }}>
                    {t.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">@{t.username}</p>
                    <p className="text-xs text-muted-foreground">{t.games} jeux trackés</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
        </div>
        <div className="relative max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
            Prêt à maîtriser<br />
            <span style={{ color: 'hsl(var(--primary))' }}>ton backlog ?</span>
          </h2>
          <Link href="/register"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold text-primary-foreground hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
            style={{ backgroundColor: 'hsl(var(--primary))', boxShadow: '0 0 40px hsl(var(--primary) / 0.5)' }}>
            Créer mon compte
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary opacity-60" />
            <span className="text-sm font-bold text-muted-foreground">Backlogg</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/cgu"     className="hover:text-foreground transition-colors">CGU</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/faq"     className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}