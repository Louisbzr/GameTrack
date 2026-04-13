'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings as SettingsIcon, Bell, Globe, Eye, Shield, Palette,
  Monitor, Smartphone, Mail, MessageSquare, Trophy, Users,
  Clock, Download, Trash2, Save, Check, ChevronDown, Volume2,
  Camera, User, FileText, ExternalLink, Lock
} from 'lucide-react'
import CropModal from '@/components/CropModal'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'
import { useSettings, DEFAULT_SETTINGS, AppSettings } from '@/components/SettingsProvider'

interface Props { userId: string; username: string; email?: string; avatarUrl?: string | null; avatarColor?: string }

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-secondary'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function CustomSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground hover:bg-secondary/80 transition-colors min-w-[120px] justify-between">
        <span>{current?.label ?? value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl border border-border shadow-xl z-50 overflow-hidden min-w-[150px]"
          style={{ backgroundColor: 'hsl(var(--background))' }}>
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left ${value === o.value ? 'text-primary' : 'text-foreground'}`}>
              {o.label}
              {value === o.value && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingRow({ icon: Icon, label, description, children }: {
  icon: any; label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-3 flex-1 min-w-0 mr-4">
        <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function SettingsPage({ userId, username, email, avatarUrl: initialAvatarUrl, avatarColor = 'forest' }: Props) {
  const supabase  = createClient()
  const router    = useRouter()
  const { theme, setTheme } = useTheme()
  const { settings: globalSettings, updateSettings: applyGlobal } = useSettings()

  const [settings, setSettings] = useState<AppSettings>(globalSettings)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string|null>(initialAvatarUrl ?? null)
  const [cropSrc,  setCropSrc]  = useState<string|null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const AVATAR_COLORS: Record<string,string> = { forest:'#22c55e', ocean:'#3b82f6', fire:'#f97316', violet:'#a855f7', rose:'#ec4899', gold:'#f59e0b', ice:'#06b6d4', slate:'#64748b' }
  const aColor = AVATAR_COLORS[avatarColor] ?? '#22c55e'

  useEffect(() => {
    supabase.from('profiles').select('settings').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data?.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
        setLoading(false)
      })
  }, [userId])

  // Apply changes live as user tweaks settings
  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    applyGlobal({ [key]: value })
    setSaved(false)
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCropConfirm(blob: Blob) {
    setUploadingAvatar(true)
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    const { error } = await supabase.storage.from('avatars').upload(`${userId}/avatar.jpg`, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar.jpg`)
      const url = data.publicUrl + '?t=' + Date.now()
      setAvatarUrl(url)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    }
    setCropSrc(null)
    setUploadingAvatar(false)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('profiles').update({ settings }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleReset() {
    if (!confirm('Réinitialiser tous les paramètres ?')) return
    setSettings(DEFAULT_SETTINGS)
    applyGlobal(DEFAULT_SETTINGS)
    await supabase.from('profiles').update({ settings: DEFAULT_SETTINGS }).eq('id', userId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExport() {
    const [libRes, revRes] = await Promise.all([
      supabase.from('library').select('*, games(name, cover_url)').eq('user_id', userId),
      supabase.from('library').select('review, rating, games(name)').eq('user_id', userId).not('review', 'is', null),
    ])
    const blob = new Blob([JSON.stringify({ username, exportDate: new Date().toISOString(), settings, library: libRes.data ?? [], reviews: revRes.data ?? [] }, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `gametrack-${new Date().toISOString().slice(0,10)}.json` })
    a.click()
  }

  async function handleDeleteAccount() {
    const confirmed = prompt(`Tapez "${username}" pour confirmer la suppression :`)
    if (confirmed !== username) return
    await supabase.from('library').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.signOut()
    router.push('/register')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <>
    <div className="min-h-screen pt-24 pb-16 bg-background" onClick={() => {}}>
      <div className="container mx-auto px-4 max-w-3xl space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : saved ? <><Check className="w-4 h-4" /> Sauvegardé</>
              : <><Save className="w-4 h-4" /> Sauvegarder</>}
          </button>
        </div>

        {/* Apparence */}
        <Section title="Apparence" icon={Palette}>
          <SettingRow icon={Monitor} label="Thème" description="Les changements s'appliquent immédiatement">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
              {(['dark', 'light'] as const).map(t => (
                <button key={t} onClick={() => setTheme(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${theme === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow icon={Globe} label="Langue" description="Langue de l'interface (rechargement requis)">
            <CustomSelect value={settings.language} onChange={v => { update('language', v); setTimeout(() => window.location.reload(), 500) }} options={[
              { value: 'fr', label: '🇫🇷 Français' },
              { value: 'en', label: '🇬🇧 English' },
              { value: 'es', label: '🇪🇸 Español' },
              { value: 'de', label: '🇩🇪 Deutsch' },
            ]} />
          </SettingRow>
          <SettingRow icon={Smartphone} label="Animations" description="Désactiver pour améliorer les performances">
            <Toggle checked={settings.animationsEnabled} onChange={v => update('animationsEnabled', v)} />
          </SettingRow>
          <SettingRow icon={Monitor} label="Mode compact" description="Réduit l'espacement pour afficher plus de contenu">
            <Toggle checked={settings.compactMode} onChange={v => update('compactMode', v)} />
          </SettingRow>
          <SettingRow icon={Volume2} label="Lecture auto des trailers" description="Lire automatiquement les vidéos sur les pages de jeux">
            <Toggle checked={settings.autoplayTrailers} onChange={v => update('autoplayTrailers', v)} />
          </SettingRow>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <SettingRow icon={Users} label="Activité des amis" description="Alertes quand vos amis ajoutent des jeux ou publient des avis">
            <Toggle checked={settings.notifFriendActivity} onChange={v => update('notifFriendActivity', v)} />
          </SettingRow>
          <SettingRow icon={Clock} label="Nouvelles sorties" description="Être notifié des jeux qui sortent cette semaine">
            <Toggle checked={settings.notifNewReleases} onChange={v => update('notifNewReleases', v)} />
          </SettingRow>
          <SettingRow icon={Trophy} label="Badges débloqués" description="Notification quand vous débloquez un nouveau badge">
            <Toggle checked={settings.notifBadges} onChange={v => update('notifBadges', v)} />
          </SettingRow>
          <SettingRow icon={MessageSquare} label="Réponses aux avis" description="Quand quelqu'un répond à vos critiques">
            <Toggle checked={settings.notifReviews} onChange={v => update('notifReviews', v)} />
          </SettingRow>
          <SettingRow icon={Mail} label="Notifications par e-mail" description="Recevoir un résumé hebdomadaire par e-mail">
            <Toggle checked={settings.notifEmail} onChange={v => update('notifEmail', v)} />
          </SettingRow>
        </Section>

        {/* Confidentialité */}
        <Section title="Confidentialité" icon={Shield}>
          <SettingRow icon={Eye} label="Profil public" description="Votre profil est visible par tout le monde">
            <Toggle checked={settings.profilePublic} onChange={v => update('profilePublic', v)} />
          </SettingRow>
          <SettingRow icon={Clock} label="Afficher l'activité" description="Les autres voient votre activité récente">
            <Toggle checked={settings.showActivity} onChange={v => update('showActivity', v)} />
          </SettingRow>
          <SettingRow icon={Monitor} label="Afficher la liste de jeux" description="Votre collection est visible sur votre profil public">
            <Toggle checked={settings.showGameList} onChange={v => update('showGameList', v)} />
          </SettingRow>
          <SettingRow icon={Trophy} label="Afficher les statistiques" description="Vos stats et badges sont visibles publiquement">
            <Toggle checked={settings.showStats} onChange={v => update('showStats', v)} />
          </SettingRow>
        </Section>

        {/* Jeux & avis */}
        <Section title="Jeux & avis" icon={Monitor}>
          <SettingRow icon={Monitor} label="Plateforme par défaut" description="Pré-sélectionnée lors de l'ajout d'un jeu">
            <CustomSelect value={settings.defaultPlatform} onChange={v => update('defaultPlatform', v)} options={[
              { value: 'pc',     label: '🖥️ PC'     },
              { value: 'ps5',    label: '🎮 PS5'    },
              { value: 'xbox',   label: '🟢 Xbox'   },
              { value: 'switch', label: '🕹️ Switch' },
              { value: 'mobile', label: '📱 Mobile' },
            ]} />
          </SettingRow>
          <SettingRow icon={Clock} label="Afficher le temps de jeu" description="Montrer les heures jouées sur votre profil">
            <Toggle checked={settings.showPlaytime} onChange={v => update('showPlaytime', v)} />
          </SettingRow>
          <SettingRow icon={Eye} label="Avertissements spoiler" description="Masquer les contenus marqués comme spoilers">
            <Toggle checked={settings.spoilerWarnings} onChange={v => update('spoilerWarnings', v)} />
          </SettingRow>
          <SettingRow icon={Trophy} label="Échelle de notation" description="Système de notes affiché dans vos avis">
            <CustomSelect value={settings.ratingScale} onChange={v => update('ratingScale', v)} options={[
              { value: '5',   label: '★ sur 5'   },
              { value: '10',  label: 'sur 10'    },
              { value: '100', label: 'sur 100'   },
            ]} />
          </SettingRow>
        </Section>

        {/* Compte */}
        <Section title="Mon compte" icon={User}>
          <SettingRow icon={Camera} label="Photo de profil" description="Votre avatar visible sur votre profil et dans les avis">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />
                  : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-border" style={{ backgroundColor: aColor }}>{username.slice(0,2).toUpperCase()}</div>
                }
              </div>
              <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/30 text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
                {uploadingAvatar ? <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                Changer
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
            </div>
          </SettingRow>
          <SettingRow icon={User} label="Nom d'utilisateur" description="Votre identifiant public sur GameTrack">
            <a href="/profile" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/30 text-sm text-foreground hover:bg-secondary transition-colors">
              @{username} <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          </SettingRow>
          {email && (
            <SettingRow icon={Mail} label="Adresse e-mail" description="Utilisée pour la connexion et les notifications">
              <span className="text-sm text-muted-foreground">{email}</span>
            </SettingRow>
          )}
        </Section>

        {/* Données */}
        <Section title="Données & compte" icon={Download}>
          <SettingRow icon={Download} label="Exporter mes données" description="Télécharger votre collection, avis et paramètres en JSON">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-secondary/30 text-sm text-foreground hover:bg-secondary transition-colors">
              <Download className="w-3.5 h-3.5" /> Exporter
            </button>
          </SettingRow>
          <SettingRow icon={Trash2} label="Réinitialiser les paramètres" description="Remettre tous les paramètres par défaut">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          </SettingRow>
          <SettingRow icon={Trash2} label="Supprimer mon compte" description="Suppression définitive de toutes vos données">
            <button onClick={handleDeleteAccount}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-sm text-red-400 hover:bg-red-500/30 transition-colors font-semibold">
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </SettingRow>
        </Section>

        {/* Politique de confidentialité */}
        <Section title="Politique de confidentialité" icon={FileText}>
          <div className="py-3 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>GameTrack collecte uniquement les données nécessaires au fonctionnement de l'application : votre adresse e-mail, pseudo, bibliothèque de jeux et préférences.</p>
            <div className="space-y-2">
              {[
                { icon: Lock, title: 'Données collectées', text: 'Email, pseudo, bibliothèque de jeux, avis, paramètres et éventuellement votre Steam ID si vous le renseignez.' },
                { icon: Eye, title: 'Utilisation', text: 'Vos données sont utilisées uniquement pour faire fonctionner GameTrack. Elles ne sont jamais vendues ni partagées avec des tiers.' },
                { icon: Shield, title: 'Sécurité', text: 'Toutes les données sont stockées de manière sécurisée via Supabase avec chiffrement au repos et en transit.' },
                { icon: Trash2, title: 'Suppression', text: 'Vous pouvez supprimer votre compte et toutes vos données à tout moment depuis la section "Données & compte" ci-dessus.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3 p-3 rounded-lg bg-secondary/30">
                  <Icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-xs mb-0.5">{title}</p>
                    <p className="text-xs">{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/70">Dernière mise à jour : Avril 2026 · GameTrack est un projet personnel.</p>
          </div>
        </Section>

      </div>
    </div>

    {/* Crop modal avatar */}
    {cropSrc && (
      <CropModal
        imageSrc={cropSrc}
        aspect={1}
        shape="circle"
        outputWidth={400}
        outputHeight={400}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropSrc(null)}
      />
    )}
    </>
  )
}