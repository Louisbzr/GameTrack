'use client'

import { useState } from 'react'
import { Mail, Send, Check, MessageSquare, Shield, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SUBJECTS = [
  { value: 'support',    label: '🛠️ Support technique',    desc: 'Problème avec l\'application' },
  { value: 'report',     label: '🚩 Signalement urgent',    desc: 'Contenu dangereux ou illégal' },
  { value: 'business',   label: '💼 Partenariat',           desc: 'Proposition commerciale' },
  { value: 'press',      label: '📰 Presse',                desc: 'Contact médias' },
  { value: 'other',      label: '💬 Autre',                 desc: 'Toute autre demande' },
]

interface Props { userId: string; userEmail: string }

export default function ContactClient({ userId, userEmail }: Props) {
  const supabase = createClient()
  const [subject,  setSubject]  = useState('')
  const [message,  setMessage]  = useState('')
  const [email,    setEmail]    = useState(userEmail)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit() {
    if (!subject || !message.trim() || !email.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('contact_messages').insert({
      user_id:  userId,
      email:    email.trim(),
      subject,
      message:  message.trim(),
    })
    if (err) setError('Erreur lors de l\'envoi.')
    else setDone(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-2xl">

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Nous contacter</h1>
          <p className="text-muted-foreground">Nous répondons généralement sous 48h.</p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: MessageSquare, label: 'FAQ',          href: '/faq',         desc: 'Réponses rapides' },
            { icon: Lightbulb,     label: 'Suggestions',  href: '/suggestions', desc: 'Proposer une idée' },
            { icon: Shield,        label: 'Signalement',  href: '#',            desc: 'Contenu illégal' },
          ].map(({ icon: Icon, label, href, desc }) => (
            <a key={label} href={href}
              className="glass rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
              <Icon className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </a>
          ))}
        </div>

        {done ? (
          <div className="glass rounded-xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Message envoyé !</h2>
            <p className="text-muted-foreground">Nous vous répondrons à <span className="text-primary">{email}</span> sous 48h.</p>
          </div>
        ) : (
          <div className="glass rounded-xl p-6 space-y-5">

            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Sujet <span className="text-red-400">*</span></p>
              <div className="space-y-2">
                {SUBJECTS.map(s => (
                  <button key={s.value} onClick={() => setSubject(s.value)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-colors ${
                      subject === s.value
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-secondary/50 text-foreground hover:bg-secondary border border-transparent'
                    }`}>
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Votre e-mail <span className="text-red-400">*</span></p>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="votre@email.com"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Message <span className="text-red-400">*</span></p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Décrivez votre demande..."
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/2000</p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!subject || !message.trim() || !email.trim() || loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send className="w-4 h-4" /> Envoyer</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}