'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gamepad2, Check, ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const GENRES = [
  { id: 'Action',          emoji: '⚔️' },
  { id: 'Adventure',       emoji: '🗺️' },
  { id: 'Role-playing (RPG)', emoji: '🧙' },
  { id: 'Strategy',        emoji: '♟️' },
  { id: 'Shooter',         emoji: '🎯' },
  { id: 'Sports',          emoji: '⚽' },
  { id: 'Racing',          emoji: '🏎️' },
  { id: 'Puzzle',          emoji: '🧩' },
  { id: 'Horror',          emoji: '👻' },
  { id: 'Platform',        emoji: '🍄' },
  { id: 'Fighting',        emoji: '🥊' },
  { id: 'Simulation',      emoji: '🏗️' },
  { id: 'Indie',           emoji: '🎨' },
  { id: 'Hack and slash',  emoji: '🗡️' },
  { id: 'MOBA',            emoji: '🏆' },
]

const AVATAR_COLORS = [
  { id: 'forest',  label: 'Forêt',    color: '#22c55e' },
  { id: 'ocean',   label: 'Océan',    color: '#3b82f6' },
  { id: 'fire',    label: 'Feu',      color: '#f97316' },
  { id: 'violet',  label: 'Violet',   color: '#a855f7' },
  { id: 'rose',    label: 'Rose',     color: '#ec4899' },
  { id: 'gold',    label: 'Or',       color: '#f59e0b' },
  { id: 'ice',     label: 'Glace',    color: '#06b6d4' },
  { id: 'slate',   label: 'Ardoise',  color: '#64748b' },
]

export default function OnboardingPage({ userId, username }: { userId: string; username: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [step,          setStep]          = useState(1)
  const [selGenres,     setSelGenres]     = useState<string[]>([])
  const [avatarColor,   setAvatarColor]   = useState('forest')
  const [loading,       setLoading]       = useState(false)

  function toggleGenre(g: string) {
    setSelGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  async function handleFinish() {
    setLoading(true)
    await supabase.from('profiles').upsert({
      id: userId,
      username,
      avatar_color: avatarColor,
      favorite_genres: selGenres,
      onboarded: true,
    })
    router.push('/discover')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <Gamepad2 className="w-9 h-9 text-primary" />
            <span className="text-2xl font-bold text-foreground">Backlogg</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-primary' : s < step ? 'w-4 bg-primary/50' : 'w-4 bg-secondary'
              }`} />
            ))}
          </div>
        </div>

        {/* Step 1 — Genres */}
        {step === 1 && (
          <div className="glass rounded-2xl p-8 border border-border space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Quels genres aimez-vous ?
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Choisissez au moins 3 genres pour personnaliser vos recommandations.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {GENRES.map(g => {
                const selected = selGenres.includes(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all border ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-center leading-tight">{g.id}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {selGenres.length} sélectionné{selGenres.length > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setStep(2)}
                disabled={selGenres.length < 1}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Suivant <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Avatar */}
        {step === 2 && (
          <div className="glass rounded-2xl p-8 border border-border space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Choisissez votre couleur
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Elle représentera votre avatar sur Backlogg.
              </p>
            </div>

            {/* Avatar preview */}
            <div className="flex justify-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg transition-all duration-300"
                style={{ backgroundColor: AVATAR_COLORS.find(c => c.id === avatarColor)?.color }}
              >
                {(username?.[0] ?? '?').toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setAvatarColor(c.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    avatarColor === c.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary/30 hover:border-primary/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full shadow-md" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                  {avatarColor === c.id && <Check className="w-3 h-3 text-primary" />}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <><Sparkles className="w-4 h-4" /> Commencer !</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}