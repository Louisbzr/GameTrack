'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Gamepad2, MessageSquare, List, Users, UserPlus,
  Trophy, Zap, Lock, Check, Camera,
  Upload, X, Pencil, ArrowLeft, Heart,
  BarChart3, Star, TrendingUp, Monitor, Link2, Unlink, Target, Medal, Flame, Calendar, PieChart as PieIcon
} from 'lucide-react'
import ReviewCard from '@/components/ReviewCard'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts'
import CropModal from '@/components/CropModal'
import StarRating from '@/components/StarRating'

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_BADGES = [
  { slug: 'first_blood',    icon: '🎮', name: 'Premier Pas',     desc: 'Jouer à votre premier jeu',  xp: 50,   locked: false, rarity: 'common' },
  { slug: 'critic',         icon: '✏️', name: 'Critique Novice', desc: 'Écrire votre premier avis',  xp: 50,   locked: false, rarity: 'common' },
  { slug: 'veteran',        icon: '💯', name: 'Centurion',       desc: 'Jouer à 100 jeux',           xp: 500,  locked: false, rarity: 'rare' },
  { slug: 'on_fire',        icon: '🏆', name: "Plume d'Or",      desc: 'Écrire 50 avis',             xp: 300,  locked: false, rarity: 'rare' },
  { slug: 'legend',         icon: '⭐', name: 'Influenceur',     desc: 'Avoir 1000 abonnés',         xp: 500,  locked: false, rarity: 'rare' },
  { slug: 'marathonien',    icon: '🏃', name: 'Marathonien',     desc: 'Jouer à 500 jeux',           xp: 1000, locked: true, rarity: 'epic'  },
  { slug: 'legende_rank',   icon: '👑', name: 'Légende',         desc: 'Atteindre le niveau 20',     xp: 2000, locked: true, rarity: 'legendary'  },
  { slug: 'sociable',       icon: '🤝', name: 'Sociable',        desc: 'Suivre 200 personnes',       xp: 200,  locked: true, rarity: 'rare'  },
  { slug: 'connaisseur',    icon: '🎯', name: 'Connaisseur',     desc: 'Noter 200 jeux',             xp: 750,  locked: true, rarity: 'epic'  },
  { slug: 'collectionneur', icon: '📚', name: 'Collectionneur',  desc: 'Créer 20 listes',            xp: 300,  locked: true, rarity: 'rare'  },
]

const AVATAR_COLORS: Record<string, string> = {
  forest:  '#22c55e',
  ocean:   '#3b82f6',
  fire:    '#f97316',
  violet:  '#a855f7',
  rose:    '#ec4899',
  gold:    '#f59e0b',
  ice:     '#06b6d4',
  slate:   '#64748b',
}

const BANNER_GRADIENTS = [
  { id: 'green',   style: 'linear-gradient(135deg, #064e3b, #052e16)' },
  { id: 'blue',    style: 'linear-gradient(135deg, #1e3a5f, #0f172a)' },
  { id: 'purple',  style: 'linear-gradient(135deg, #3b0764, #1e1b4b)' },
  { id: 'orange',  style: 'linear-gradient(135deg, #7c2d12, #1c1917)' },
  { id: 'rose',    style: 'linear-gradient(135deg, #881337, #1c1917)' },
  { id: 'slate',   style: 'linear-gradient(135deg, #1e293b, #0f172a)' },
  { id: 'teal',    style: 'linear-gradient(135deg, #134e4a, #052e16)' },
  { id: 'indigo',  style: 'linear-gradient(135deg, #312e81, #1e1b4b)' },
]

interface Props {
  profile: any
  library: any[]
  badges: any[]
  xpHistory: any[]
  stats: { total: number; completed: number; playing: number; avgRating: string }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfileClient({ profile, library, badges, xpHistory, stats }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const unlockedSlugs = new Set(badges.map((b: any) => b.badge_slug))
  const level       = profile?.level || 1
  const xp          = profile?.xp || 0
  const xpNeeded    = level * 200
  const xpPercent   = Math.round(((xp % xpNeeded) / xpNeeded) * 100)

  // Profile state
  const [username,    setUsername]    = useState(profile?.username || 'Joueur')
  const [bio,         setBio]         = useState(profile?.bio || '')
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color || 'forest')
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(profile?.avatar_url || null)
  const [bannerUrl,   setBannerUrl]   = useState<string | null>(profile?.banner_url || null)
  const [bannerGrad,  setBannerGrad]  = useState(profile?.banner_gradient || 'green')

  // Edit mode
  const [editing,     setEditing]     = useState(false)
  const [eName,       setEName]       = useState(username)
  const [eBio,        setEBio]        = useState(bio)
  const [eAvatarColor, setEAvatarColor] = useState(avatarColor)
  const [eAvatarUrl,  setEAvatarUrl]  = useState<string | null>(avatarUrl)
  const [eBannerUrl,  setEBannerUrl]  = useState<string | null>(bannerUrl)
  const [eBannerGrad, setEBannerGrad] = useState(bannerGrad)
  const [eSteamId,    setESteamId]    = useState(profile?.steam_id ?? '')
  const [steamSyncing, setSteamSyncing] = useState(false)
  const [activeTab,    setActiveTab]    = useState<'jeux'|'stats'|'succes'|'amis'|'plateformes'>('jeux')
  const [platConnected, setPlatConnected] = useState<Record<string,boolean>>({ steam: !!profile?.steam_id })
  const [badgeFilter,   setBadgeFilter]   = useState<string>('all')
  const [saving,      setSaving]      = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc,    setCropSrc]    = useState<string | null>(null)
  const [cropMode,   setCropMode]   = useState<'avatar' | 'banner' | null>(null)

  const earnedBadges = ALL_BADGES.filter(b => unlockedSlugs.has(b.slug) || !b.locked)
  const lockedBadges = ALL_BADGES.filter(b => !unlockedSlugs.has(b.slug) && b.locked)
  const favGames     = library.filter((l: any) => l.is_favorite && l.games?.cover_url).slice(0, 8)
  const userReviews  = library.filter((l: any) => l.review).slice(0, 4)

  const color = AVATAR_COLORS[avatarColor] ?? AVATAR_COLORS.forest
  const bannerGradStyle = BANNER_GRADIENTS.find(g => g.id === bannerGrad)?.style ?? BANNER_GRADIENTS[0].style

  // ── Upload helpers ──────────────────────────────────────────────────────

  async function uploadFile(file: File, bucket: string, path: string): Promise<string | null> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setCropSrc(ev.target?.result as string); setCropMode('avatar') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setCropSrc(ev.target?.result as string); setCropMode('banner') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCropConfirm(blob: Blob) {
    if (cropMode === 'avatar') {
      setUploadingAvatar(true)
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      const url = await uploadFile(file, 'avatars', `${profile.id}/avatar.jpg`)
      if (url) setEAvatarUrl(url + '?t=' + Date.now())
      setUploadingAvatar(false)
    } else {
      setUploadingBanner(true)
      const file = new File([blob], 'banner.jpg', { type: 'image/jpeg' })
      const url = await uploadFile(file, 'banners', `${profile.id}/banner.jpg`)
      if (url) setEBannerUrl(url + '?t=' + Date.now())
      setUploadingBanner(false)
    }
    setCropSrc(null)
    setCropMode(null)
  }

  // ── Save ────────────────────────────────────────────────────────────────

  function openEdit() {
    setEName(username); setEBio(bio)
    setEAvatarColor(avatarColor); setEAvatarUrl(avatarUrl)
    setEBannerUrl(bannerUrl); setEBannerGrad(bannerGrad)
    setEditing(true)
  }

  async function save() {
    if (!eName.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({
      username:         eName.trim(),
      bio:              eBio.trim() || null,
      avatar_color:     eAvatarColor,
      avatar_url:       eAvatarUrl,
      banner_url:       eBannerUrl,
      banner_gradient:  eBannerGrad,
      steam_id:         eSteamId.trim() || null,
      updated_at:       new Date().toISOString(),
    }).eq('id', profile.id)
    setUsername(eName.trim())
    setBio(eBio.trim())
    setAvatarColor(eAvatarColor)
    setAvatarUrl(eAvatarUrl)
    setBannerUrl(eBannerUrl)
    setBannerGrad(eBannerGrad)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  // ── Avatar display ──────────────────────────────────────────────────────

  function Avatar({ url, color: c, name, size = 28 }: { url?: string | null; color?: string; name: string; size?: number }) {
    const sz = `${size * 4}px`
    if (url) return (
      <img src={url} alt={name} className="rounded-full object-cover ring-4 ring-background shadow-xl"
        style={{ width: sz, height: sz }} />
    )
    return (
      <div className="rounded-full flex items-center justify-center font-bold text-white ring-4 ring-background shadow-xl"
        style={{ width: sz, height: sz, backgroundColor: c ?? '#22c55e', fontSize: size > 10 ? '1.5rem' : '0.75rem' }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (editing) {
    const previewColor = AVATAR_COLORS[eAvatarColor] ?? AVATAR_COLORS.forest
    const previewBannerGrad = BANNER_GRADIENTS.find(g => g.id === eBannerGrad)?.style ?? BANNER_GRADIENTS[0].style

    return (
      <>
      <div className="min-h-screen pt-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl pb-16">

          {/* Header */}
          <div className="flex items-center gap-3 py-6">
            <button onClick={() => setEditing(false)}
              className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-foreground flex-1">Modifier le profil</h1>
            <button onClick={save} disabled={saving || !eName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <><Check className="w-4 h-4" /> Enregistrer</>
              }
            </button>
          </div>

          <div className="space-y-6">

            {/* ── Bannière ── */}
            <div className="glass rounded-xl p-5 border border-border space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Bannière
              </h2>

              {/* Preview */}
              <div className="relative h-32 rounded-xl overflow-hidden group cursor-pointer"
                style={{ background: eBannerUrl ? undefined : previewBannerGrad }}
                onClick={() => bannerInputRef.current?.click()}>
                {eBannerUrl && (
                  <img src={eBannerUrl} alt="Bannière" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                  {uploadingBanner
                    ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>
                        <Camera className="w-6 h-6 text-white" />
                        <span className="text-white text-xs font-medium">Changer la bannière</span>
                      </>
                  }
                </div>
                {eBannerUrl && (
                  <button onClick={e => { e.stopPropagation(); setEBannerUrl(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />

              {/* Gradient picker */}
              {!eBannerUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Ou choisissez un dégradé :</p>
                  <div className="grid grid-cols-8 gap-2">
                    {BANNER_GRADIENTS.map(g => (
                      <button key={g.id} onClick={() => setEBannerGrad(g.id)}
                        className={`h-8 rounded-lg transition-all ${eBannerGrad === g.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-105'}`}
                        style={{ background: g.style }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Avatar ── */}
            <div className="glass rounded-xl p-5 border border-border space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Photo de profil
              </h2>

              <div className="flex items-center gap-6">
                {/* Preview */}
                <div className="relative flex-shrink-0">
                  <div className="relative w-20 h-20 cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
                    {eAvatarUrl
                      ? <img src={eAvatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover ring-4 ring-border" />
                      : <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white ring-4 ring-border"
                          style={{ backgroundColor: previewColor }}>
                          {eName.slice(0, 2).toUpperCase() || '?'}
                        </div>
                    }
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Camera className="w-5 h-5 text-white" />
                      }
                    </div>
                    {eAvatarUrl && (
                      <button onClick={e => { e.stopPropagation(); setEAvatarUrl(null) }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>

                {/* Color picker (shown when no custom photo) */}
                {!eAvatarUrl && (
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">Couleur de l'avatar :</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(AVATAR_COLORS).map(([key, hex]) => (
                        <button key={key} onClick={() => setEAvatarColor(key)}
                          className={`w-full h-8 rounded-lg transition-all ${eAvatarColor === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-105'}`}
                          style={{ backgroundColor: hex }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Cliquez sur la photo pour en uploader une. Max 2 Mo.</p>
            </div>

            {/* ── Pseudo & Bio ── */}
            <div className="glass rounded-xl p-5 border border-border space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" /> Informations
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pseudo</label>
                <input
                  value={eName}
                  onChange={e => setEName(e.target.value.replace(/\s/g, ''))}
                  maxLength={20}
                  placeholder="votre_pseudo"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
                <p className="text-xs text-muted-foreground">{eName.length}/20 caractères</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</label>
                <textarea
                  value={eBio}
                  onChange={e => setEBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  placeholder="Quelques mots sur vous…"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">{eBio.length}/160 caractères</p>
              </div>
            </div>

            {/* ── Steam ── */}
            <div className="glass rounded-xl p-5 border border-border space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/></svg>
                Synchronisation Steam
              </h2>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Steam ID ou URL de profil</label>
                <div className="flex gap-2">
                  <input
                    value={eSteamId}
                    onChange={e => setESteamId(e.target.value)}
                    placeholder="76561198xxxxxxxxx ou https://steamcommunity.com/id/..."
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Une fois sauvegardé, rendez-vous sur <a href="/steam-import" className="text-primary hover:underline">Importer depuis Steam</a> pour synchroniser vos jeux.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Crop modal */}
      {cropSrc && cropMode && (
        <CropModal
          imageSrc={cropSrc}
          aspect={cropMode === 'avatar' ? 1 : 16 / 6}
          shape={cropMode === 'avatar' ? 'circle' : 'rect'}
          outputWidth={cropMode === 'avatar' ? 400 : 1200}
          outputHeight={cropMode === 'avatar' ? 400 : 450}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); setCropMode(null) }}
        />
      )}
    </>
  )
  }

  // ── Profile view ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-16 bg-background">

      {/* Banner */}
      <div className="relative h-48 overflow-hidden"
        style={{ background: bannerUrl ? undefined : bannerGradStyle }}>
        {bannerUrl && <img src={bannerUrl} alt="Bannière" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-16">

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-8">
          <div className="relative flex-shrink-0">
            <Avatar url={avatarUrl} color={color} name={username} size={28} />
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-background">
              {level}
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-foreground">{username}</h1>
            <p className="text-sm text-primary font-medium">@{username.toLowerCase().replace(/\s+/g, '')}</p>
            {bio && <p className="text-sm text-muted-foreground mt-1 max-w-md">{bio}</p>}
          </div>
          <button onClick={openEdit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass font-semibold text-sm text-foreground hover:bg-secondary/60 transition-colors">
            <Pencil className="w-4 h-4" /> Modifier le profil
          </button>
        </div>

        {/* XP bar */}
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

        {/* ── Quick stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { icon: Gamepad2,      label: 'Joués',    value: stats.total },
            { icon: MessageSquare, label: 'Avis',     value: library.filter((l:any) => l.review).length },
            { icon: Heart,         label: 'Favoris',  value: library.filter((l:any) => l.is_favorite).length },
            { icon: Trophy,        label: 'Terminés', value: library.filter((l:any) => l.status==='completed').length },
            { icon: Star,          label: 'Note moy', value: (() => { const r = library.filter((l:any) => l.rating); return r.length ? (r.reduce((s:number,l:any)=>s+Number(l.rating),0)/r.length).toFixed(1) : '—' })() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass rounded-xl p-4 text-center">
              <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="font-bold text-xl text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        {(() => {
          const TABS = [
            { id: 'jeux',        label: 'Jeux',         icon: Gamepad2  },
            { id: 'stats',       label: 'Statistiques', icon: BarChart3 },
            { id: 'succes',      label: 'Succès',       icon: Trophy    },
            { id: 'amis',        label: 'Amis',         icon: Users     },
            { id: 'plateformes', label: 'Plateformes',  icon: Monitor   },
          ] as const

          // Computed data for tabs
          const ratedGames     = library.filter((l:any) => l.rating)
          const completedGames = library.filter((l:any) => l.status === 'completed')

          const genreCount: Record<string,number> = {}
          library.forEach((l:any) => { (l.games?.genres ?? []).forEach((g:string) => { genreCount[g] = (genreCount[g]||0)+1 }) })
          const genreData = Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))

          const statusData = [
            { name:'Terminés',   value: completedGames.length },
            { name:'En cours',   value: library.filter((l:any)=>l.status==='playing').length },
            { name:'À faire',    value: library.filter((l:any)=>l.status==='backlog').length },
            { name:'Abandonnés', value: library.filter((l:any)=>l.status==='dropped').length },
          ].filter(d=>d.value>0)

          const ratingBuckets = [0,0,0,0,0]
          ratedGames.forEach((l:any)=>{ const b=Math.min(Math.floor(Number(l.rating))-1,4); if(b>=0) ratingBuckets[b]++ })
          const ratingData = ratingBuckets.map((count,i)=>({name:`${i+1}★`,count}))

          const CHART_COLORS = ['hsl(142,70%,49%)','hsl(270,60%,60%)','hsl(200,80%,55%)','hsl(35,100%,55%)','hsl(330,60%,60%)','hsl(180,100%,50%)','hsl(0,70%,55%)','hsl(60,80%,50%)']

          const PLATFORMS = [
            { id:'steam',    name:'Steam',       icon:'🖥️' },
            { id:'psn',      name:'PlayStation', icon:'🎮' },
            { id:'xbox',     name:'Xbox',        icon:'🟢' },
            { id:'nintendo', name:'Nintendo',    icon:'🔴' },
            { id:'epic',     name:'Epic Games',  icon:'🔺' },
            { id:'gog',      name:'GOG',         icon:'🌐' },
          ]

          return (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 overflow-x-auto bg-secondary/40 border border-border p-1 rounded-xl mb-6 no-scrollbar">
                {TABS.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                        activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}>
                      <Icon className="w-4 h-4" />{tab.label}
                    </button>
                  )
                })}
              </div>

              {/* ── JEUX ── */}
              {activeTab === 'jeux' && (
                <div className="space-y-10">
                  {/* Favoris */}
                  <section>
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-400 fill-red-400" /> Jeux favoris
                    </h2>
                    {favGames.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                        {favGames.map((item:any) => {
                          const g = item.games
                          return (
                            <a key={item.id} href={`/games/${g?.id}`} className="game-card-hover group block">
                              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary">
                                {g?.cover_url
                                  ? <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                  : <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
                                }
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center shadow">
                                  <Heart className="w-2.5 h-2.5 fill-white text-white" />
                                </div>
                              </div>
                              <p className="font-semibold text-[11px] text-foreground group-hover:text-primary transition-colors truncate mt-1.5">{g?.name}</p>
                            </a>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="glass rounded-xl p-6 text-center text-muted-foreground border border-border">
                        <Heart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Aucun favori. Cliquez sur ❤️ sur une page jeu.</p>
                      </div>
                    )}
                  </section>

                  {/* Par statut */}
                  {[
                    { status:'completed', label:'Terminés',   color:'#22c55e' },
                    { status:'playing',   label:'En cours',   color:'#3b82f6' },
                    { status:'backlog',   label:'À faire',    color:'#f59e0b' },
                    { status:'dropped',   label:'Abandonnés', color:'#ef4444' },
                  ].map(s => {
                    const games = library.filter((l:any) => l.status === s.status && l.games)
                    if (!games.length) return null
                    return (
                      <section key={s.status}>
                        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          {s.label} <span className="text-muted-foreground font-normal text-sm">({games.length})</span>
                        </h2>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
                          {games.slice(0,18).map((item:any) => {
                            const g = item.games
                            return (
                              <a key={item.id} href={`/games/${g?.id}`} className="game-card-hover group block">
                                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
                                  {g?.cover_url
                                    ? <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    : <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>
                                  }
                                </div>
                                <p className="font-medium text-[10px] text-foreground group-hover:text-primary transition-colors truncate mt-1">{g?.name}</p>
                              </a>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}

                  {/* Derniers avis */}
                  {userReviews.length > 0 && (
                    <section>
                      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Derniers avis</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userReviews.map((item:any) => (
                          <ReviewCard key={item.id}
                            review={{ id: item.id, username, avatar_color: avatarColor, avatar_url: avatarUrl ?? undefined, rating: item.rating, review: item.review, updated_at: item.updated_at }}
                            gameTitle={item.games?.name} gameId={item.games?.id}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* ── STATISTIQUES ── */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: Gamepad2,    label: 'Jeux au total', value: stats.total },
                      { icon: Trophy,      label: 'Terminés',      value: completedGames.length },
                      { icon: TrendingUp,  label: 'En cours',      value: library.filter((l:any)=>l.status==='playing').length },
                      { icon: Star,        label: 'Note moyenne',  value: ratedGames.length ? (ratedGames.reduce((s:number,l:any)=>s+Number(l.rating),0)/ratedGames.length).toFixed(1) : '—' },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="glass rounded-xl p-5 text-center">
                        <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-3xl font-bold text-foreground">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  {library.length === 0 ? (
                    <div className="glass rounded-xl p-10 text-center text-muted-foreground">
                      <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">Aucune donnée — ajoutez des jeux !</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Genres */}
                      {genreData.length > 0 && (
                        <div className="glass rounded-xl p-5">
                          <h3 className="font-semibold text-foreground mb-4 text-sm flex items-center gap-2"><PieIcon className="w-4 h-4 text-primary" /> Répartition par genre</h3>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2} stroke="hsl(var(--background))">
                                  {genreData.map((_:any,idx:number) => <Cell key={idx} fill={CHART_COLORS[idx%CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor:'hsl(var(--background))', border:'1px solid hsl(var(--border))', borderRadius:'8px', color:'hsl(var(--foreground))' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {genreData.map((g:any,i:number) => (
                              <span key={g.name} className="text-[10px] flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i%CHART_COLORS.length] }} />
                                {g.name} ({g.value})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      {statusData.length > 0 && (
                        <div className="glass rounded-xl p-5">
                          <h3 className="font-semibold text-foreground mb-4 text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Statut des jeux</h3>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={statusData}>
                                <XAxis dataKey="name" tick={{ fontSize:10, fill:'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize:10, fill:'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor:'hsl(var(--background))', border:'1px solid hsl(var(--border))', borderRadius:'8px', color:'hsl(var(--foreground))' }} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Genres bar */}
                      {genreData.length > 0 && (
                        <div className="glass rounded-xl p-5">
                          <h3 className="font-semibold text-foreground mb-4 text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Genres favoris</h3>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={genreData.slice(0,6)} layout="vertical">
                                <XAxis type="number" tick={{ fontSize:10, fill:'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={90} />
                                <Tooltip contentStyle={{ backgroundColor:'hsl(var(--background))', border:'1px solid hsl(var(--border))', borderRadius:'8px', color:'hsl(var(--foreground))' }} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Rating distribution */}
                      {ratedGames.length > 0 && (
                        <div className="glass rounded-xl p-5">
                          <h3 className="font-semibold text-foreground mb-4 text-sm flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Distribution des notes</h3>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={ratingData}>
                                <XAxis dataKey="name" tick={{ fontSize:11, fill:'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize:10, fill:'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor:'hsl(var(--background))', border:'1px solid hsl(var(--border))', borderRadius:'8px', color:'hsl(var(--foreground))' }} />
                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── SUCCÈS ── */}
              {activeTab === 'succes' && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: Trophy,  label: 'Débloqués',  value: earnedBadges.length },
                      { icon: Target,  label: 'Total',       value: ALL_BADGES.length },
                      { icon: Zap,     label: 'XP gagnés',  value: earnedBadges.reduce((s,b)=>s+b.xp,0).toLocaleString() },
                      { icon: Medal,   label: 'Complétion', value: `${Math.round((earnedBadges.length/ALL_BADGES.length)*100)}%` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="glass rounded-xl p-4 text-center">
                        <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">Progression globale</span>
                      <span className="text-sm text-primary font-bold">{earnedBadges.length}/{ALL_BADGES.length}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(earnedBadges.length/ALL_BADGES.length)*100}%` }} />
                    </div>
                  </div>

                  {/* Filters */}
                  {(() => {
                    const filtered = badgeFilter === 'all' ? ALL_BADGES
                      : badgeFilter === 'unlocked' ? ALL_BADGES.filter(b => !b.locked || unlockedSlugs.has(b.slug))
                      : ALL_BADGES.filter(b => b.locked && !unlockedSlugs.has(b.slug))
                    return (
                      <>
                        <div className="flex gap-2 flex-wrap">
                          {[['all','Tous'],['unlocked','Débloqués'],['locked','À débloquer']].map(([k,l]) => (
                            <button key={k} onClick={() => setBadgeFilter(k)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${badgeFilter===k ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {filtered.map(badge => {
                            const unlocked = !badge.locked || unlockedSlugs.has(badge.slug)
                            const RARITY_BORDER: Record<string,string> = { common:'border-border', rare:'border-blue-500/40', epic:'border-purple-500/40', legendary:'border-yellow-500/40' }
                            const RARITY_TEXT: Record<string,string> = { common:'text-muted-foreground', rare:'text-blue-400', epic:'text-purple-400', legendary:'text-yellow-400' }
                            return (
                              <div key={badge.slug} className={`glass rounded-xl p-4 border transition-colors ${unlocked ? RARITY_BORDER[badge.rarity??'common'] : 'border-border opacity-40'}`}>
                                <span className={`text-3xl block mb-2 text-center ${unlocked ? '' : 'grayscale'}`}>{badge.icon}</span>
                                <p className="font-semibold text-sm text-foreground text-center">{badge.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-1 text-center">{badge.desc}</p>
                                <div className="flex items-center justify-between mt-3">
                                  <span className={`text-[10px] font-bold uppercase ${RARITY_TEXT[badge.rarity??'common']}`}>{badge.rarity ?? 'common'}</span>
                                  <span className="text-[10px] text-primary font-bold flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />+{badge.xp}</span>
                                </div>
                                {unlocked && (
                                  <div className="flex items-center justify-center gap-1 mt-2">
                                    <Trophy className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] text-primary font-medium">Débloqué !</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* ── AMIS ── */}
              {activeTab === 'amis' && (
                <div className="glass rounded-xl p-8 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-foreground">Gérez vos amis</p>
                  <p className="text-sm mt-1 mb-5">Retrouvez vos amis et leur activité gaming sur la page dédiée.</p>
                  <a href="/friends" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                    <Users className="w-4 h-4" /> Voir mes amis
                  </a>
                </div>
              )}

              {/* ── PLATEFORMES ── */}
              {activeTab === 'plateformes' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Connectez vos comptes pour synchroniser votre bibliothèque de jeux.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {PLATFORMS.map(p => {
                      const connected = platConnected[p.id] ?? false
                      return (
                        <div key={p.id} className={`glass rounded-xl p-5 border transition-colors ${connected ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">{p.icon}</span>
                            <div>
                              <p className="font-semibold text-foreground">{p.name}</p>
                              <p className={`text-xs ${connected ? 'text-primary' : 'text-muted-foreground'}`}>{connected ? '✓ Connecté' : 'Non connecté'}</p>
                            </div>
                          </div>
                          {p.id === 'steam' && connected && (
                            <a href="/steam-import" className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors mb-2">
                              🔄 Synchroniser les jeux
                            </a>
                          )}
                          <button
                            onClick={() => setPlatConnected(prev => ({ ...prev, [p.id]: !connected }))}
                            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                              connected ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}>
                            {connected ? <><Unlink className="w-3.5 h-3.5" /> Déconnecter</> : <><Link2 className="w-3.5 h-3.5" /> Connecter</>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}