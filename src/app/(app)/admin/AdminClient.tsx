'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, Users, Gamepad2, Flag, Check, X, Eye, Trash2,
  BarChart3, AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  stats: { users: number; games: number; library: number; reports: number }
  reports: any[]
  recentUsers: any[]
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam', harassment: 'Harcèlement', inappropriate: 'Inapproprié',
  spoiler: 'Spoiler', fake: 'Fausse info', other: 'Autre'
}
const TARGET_LABELS: Record<string, string> = {
  review: 'Avis', profile: 'Profil', comment: 'Commentaire', discussion: 'Discussion'
}
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'En attente', color: 'text-yellow-400' },
  reviewed: { label: 'En cours',   color: 'text-blue-400'   },
  resolved: { label: 'Résolu',     color: 'text-primary'    },
  dismissed:{ label: 'Ignoré',     color: 'text-muted-foreground' },
}

export default function AdminClient({ stats, reports: initialReports, recentUsers }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'users'>('overview')
  const [reports,   setReports]   = useState(initialReports)
  const [filter,    setFilter]    = useState<string>('pending')
  const [updating,  setUpdating]  = useState<string | null>(null)

  async function updateReport(id: string, status: string) {
    setUpdating(id)
    await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setUpdating(null)
  }

  async function deleteContent(report: any) {
    if (!confirm('Supprimer ce contenu ?')) return
    setUpdating(report.id)
    if (report.target_type === 'review') {
      await supabase.from('library').update({ review: null, rating: null }).eq('id', report.target_id)
    } else if (report.target_type === 'comment') {
      await supabase.from('comments').delete().eq('id', report.target_id)
    }
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id)
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r))
    setUpdating(null)
  }

  async function banUser(userId: string) {
    if (!confirm('Supprimer ce compte utilisateur ?')) return
    await supabase.from('library').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    router.refresh()
  }

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.status === filter)
  const pendingCount = reports.filter(r => r.status === 'pending').length

  const TABS = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'reports',  label: `Signalements${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: Flag },
    { id: 'users',    label: 'Utilisateurs',    icon: Users },
  ] as const

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
            <p className="text-sm text-muted-foreground">Gestion de GameTrack</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/40 border border-border p-1 rounded-xl mb-8">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
                  activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            )
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Users,    label: 'Utilisateurs', value: stats.users,   color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
                { icon: Gamepad2, label: 'Jeux',          value: stats.games,   color: 'text-primary',    bg: 'bg-primary/10'    },
                { icon: BarChart3,label: 'Entrées lib.',  value: stats.library, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { icon: Flag,     label: 'Signalements',  value: stats.reports, color: 'text-red-400',    bg: 'bg-red-500/10'    },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="glass rounded-xl p-5">
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {pendingCount > 0 && (
              <div className="glass rounded-xl p-5 border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{pendingCount} signalement{pendingCount > 1 ? 's' : ''} en attente</p>
                    <p className="text-sm text-muted-foreground">Des contenus nécessitent votre attention.</p>
                  </div>
                  <button onClick={() => { setActiveTab('reports'); setFilter('pending') }}
                    className="px-4 py-2 rounded-lg bg-yellow-500/15 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/25 transition-colors">
                    Traiter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REPORTS ── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {[['pending','En attente'],['reviewed','En cours'],['resolved','Résolu'],['dismissed','Ignoré'],['all','Tous']].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filter === k ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}>
                  {l}
                  {k === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5">{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="glass rounded-xl p-10 text-center text-muted-foreground">
                <Flag className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Aucun signalement dans cette catégorie</p>
              </div>
            ) : (
              filteredReports.map(report => (
                <div key={report.id} className="glass rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground uppercase">
                          {TARGET_LABELS[report.target_type] ?? report.target_type}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400">
                          {REASON_LABELS[report.reason] ?? report.reason}
                        </span>
                        <span className={`text-xs font-semibold ${STATUS_CONFIG[report.status]?.color}`}>
                          {STATUS_CONFIG[report.status]?.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Signalé par <span className="text-foreground font-medium">@{report.profiles?.username ?? '?'}</span>
                        {' · '}{new Date(report.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      {report.details && (
                        <p className="text-sm text-foreground bg-secondary/50 rounded-lg px-3 py-2 mt-1">"{report.details}"</p>
                      )}
                    </div>

                    {/* Actions */}
                    {report.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => updateReport(report.id, 'dismissed')}
                          disabled={updating === report.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> Ignorer
                        </button>
                        <button onClick={() => deleteContent(report)}
                          disabled={updating === report.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                        <button onClick={() => updateReport(report.id, 'resolved')}
                          disabled={updating === report.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-xs font-semibold text-primary hover:bg-primary/25 transition-colors">
                          <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                        </button>
                      </div>
                    )}
                    {report.status !== 'pending' && (
                      <button onClick={() => updateReport(report.id, 'pending')}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                        <RefreshCw className="w-3 h-3" /> Rouvrir
                      </button>
                    )}
                  </div>

                  {/* View content link */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">ID cible : {report.target_id.slice(0, 8)}...</span>
                    {report.target_type === 'profile' && (
                      <Link href={`/${report.profiles?.username}`}
                        className="text-xs text-primary hover:underline">Voir le profil</Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {recentUsers.map((user: any) => (
              <div key={user.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-secondary">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: '#22c55e' }}>
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">@{user.username}</p>
                    {user.is_admin && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold">ADMIN</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Niveau {user.level ?? 1} · {user.xp ?? 0} XP
                    · Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/${user.username}`}
                    className="p-1.5 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                  {!user.is_admin && (
                    <button onClick={() => banUser(user.id)}
                      className="p-1.5 rounded-lg glass text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}