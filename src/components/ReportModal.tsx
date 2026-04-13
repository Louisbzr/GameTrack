'use client'

import { useState } from 'react'
import { X, Flag, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  targetType: 'review' | 'profile' | 'comment' | 'discussion'
  targetId: string
  reporterId: string
  onClose: () => void
}

const REASONS = [
  { value: 'spam',          label: 'Spam ou publicité' },
  { value: 'harassment',    label: 'Harcèlement ou insultes' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'spoiler',       label: 'Spoiler non signalé' },
  { value: 'fake',          label: 'Fausse information' },
  { value: 'other',         label: 'Autre' },
]

export default function ReportModal({ targetType, targetId, reporterId, onClose }: Props) {
  const supabase = createClient()
  const [reason,   setReason]   = useState('')
  const [details,  setDetails]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit() {
    if (!reason) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id:   targetId,
      reason,
      details:     details.trim() || null,
    })
    if (err) {
      if (err.code === '23505') setError('Vous avez déjà signalé ce contenu.')
      else setError('Erreur lors du signalement.')
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" />
            <h2 className="font-bold text-foreground">Signaler</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground mb-1">Signalement envoyé</p>
            <p className="text-sm text-muted-foreground mb-5">Notre équipe va examiner ce contenu.</p>
            <button onClick={onClose}
              className="px-5 py-2 rounded-lg bg-secondary text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors">
              Fermer
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Raison du signalement</p>
              <div className="space-y-1.5">
                {REASONS.map(r => (
                  <button key={r.value} onClick={() => setReason(r.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      reason === r.value
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-secondary/50 text-foreground hover:bg-secondary border border-transparent'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">Détails <span className="text-muted-foreground font-normal">(optionnel)</span></p>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder="Précisez si nécessaire..."
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pb-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-sm font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={!reason || loading}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Flag className="w-3.5 h-3.5" /> Signaler</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}