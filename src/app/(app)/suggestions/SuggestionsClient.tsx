'use client'

import { useState } from 'react'
import { Lightbulb, Send, Check, Sparkles, Palette, Bug, Database, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'feature', label: 'Nouvelle fonctionnalité', icon: Sparkles,    color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  { value: 'ui',      label: 'Interface / Design',      icon: Palette,     color: 'text-purple-400',  bg: 'bg-purple-400/10'  },
  { value: 'bug',     label: 'Signaler un bug',         icon: Bug,         color: 'text-red-400',     bg: 'bg-red-400/10'     },
  { value: 'content', label: 'Contenu / Données',       icon: Database,    color: 'text-blue-400',    bg: 'bg-blue-400/10'    },
  { value: 'other',   label: 'Autre',                   icon: MessageSquare, color: 'text-muted-foreground', bg: 'bg-secondary/60' },
]

interface Props { userId: string }

export default function SuggestionsClient({ userId }: Props) {
  const supabase = createClient()
  const [category, setCategory]   = useState('')
  const [title,    setTitle]      = useState('')
  const [body,     setBody]       = useState('')
  const [loading,  setLoading]    = useState(false)
  const [done,     setDone]       = useState(false)
  const [error,    setError]      = useState('')

  async function handleSubmit() {
    if (!category || !title.trim() || !body.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('suggestions').insert({
      user_id:  userId,
      category,
      title:    title.trim(),
      body:     body.trim(),
    })
    if (err) setError('Erreur lors de l\'envoi. Réessayez.')
    else setDone(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-2xl">

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
            <Lightbulb className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Suggestions</h1>
          <p className="text-muted-foreground">Votre avis nous aide à améliorer Backlogg.</p>
        </div>

        {done ? (
          <div className="glass rounded-xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Merci !</h2>
            <p className="text-muted-foreground mb-6">Votre suggestion a bien été envoyée. Nous la lirons attentivement.</p>
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              
              <span className="font-semibold">+10 XP pour votre contribution</span>
            </div>
            <button onClick={() => { setDone(false); setTitle(''); setBody(''); setCategory('') }}
              className="mt-6 px-5 py-2.5 rounded-xl glass text-sm font-semibold text-foreground hover:bg-secondary/60 transition-colors">
              Faire une autre suggestion
            </button>
          </div>
        ) : (
          <div className="glass rounded-xl p-6 space-y-5">

            {/* Catégorie */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Catégorie <span className="text-red-400">*</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map(c => {
                  const Icon = c.icon
                  const active = category === c.value
                  return (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-left transition-colors font-medium ${
                        active
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-secondary/50 text-foreground hover:bg-secondary border border-transparent'
                      }`}>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-primary/20' : c.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : c.color}`} />
                      </div>
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Titre */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Titre <span className="text-red-400">*</span></p>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Résumez votre idée en une ligne..."
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Description <span className="text-red-400">*</span></p>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Décrivez votre suggestion en détail. Pourquoi serait-elle utile ? Comment fonctionnerait-elle ?"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{body.length}/1000</p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!category || !title.trim() || !body.trim() || loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send className="w-4 h-4" /> Envoyer ma suggestion</>
              }
            </button>

          </div>
        )}

      </div>
    </div>
  )
}