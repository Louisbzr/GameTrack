'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PLAYER_TYPES = [
  { id: 'competitive',  label: 'Compétiteur',      emoji: '🏆' },
  { id: 'casual',       label: 'Casual',            emoji: '🌿' },
  { id: 'narrative',    label: 'Narratif',          emoji: '📖' },
  { id: 'completionist',label: 'Completionniste',   emoji: '🎯' },
]

const GENRES = [
  { id: 'action-rpg',  label: 'Action RPG',    emoji: '⚔️' },
  { id: 'adventure',   label: 'Aventure',      emoji: '🌌' },
  { id: 'roguelite',   label: 'Roguelite',     emoji: '🔀' },
  { id: 'platformer',  label: 'Platformer',    emoji: '🏃' },
  { id: 'puzzle',      label: 'Puzzle',        emoji: '🧠' },
  { id: 'open-world',  label: 'Open World',    emoji: '🌆' },
  { id: 'indie',       label: 'Indépendant',   emoji: '🎻' },
  { id: 'fps',         label: 'FPS / TPS',     emoji: '⚡' },
]

const STARTER_GAMES = [
  { name: 'Elden Ring',     genre: 'Action RPG',   emoji: '⚔️' },
  { name: 'Hollow Knight',  genre: 'Metroidvania', emoji: '🦋' },
  { name: 'Balatro',        genre: 'Roguelite',    emoji: '🃏' },
  { name: 'Celeste',        genre: 'Platformer',   emoji: '🏔' },
  { name: 'Dave the Diver', genre: 'Aventure',     emoji: '🌊' },
  { name: 'Outer Wilds',    genre: 'Aventure',     emoji: '🌌' },
]

export default function OnboardingPage() {
  const [step,         setStep]         = useState(1)
  const [username,     setUsername]     = useState('')
  const [playerType,   setPlayerType]   = useState('')
  const [genres,       setGenres]       = useState<string[]>([])
  const [selectedGame, setSelectedGame] = useState('')
  const [loading,      setLoading]      = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  function toggleGenre(id: string) {
    setGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  async function finish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from('profiles').update({
      display_name:    username || undefined,
      player_type:     playerType,
      favorite_genres: genres,
      onboarding_done: true,
      xp:              100,
    }).eq('id', user.id)

    await supabase.from('xp_transactions').insert({ user_id: user.id, amount: 100, reason: 'welcome_bonus' })

    if (selectedGame) {
      const game = STARTER_GAMES.find(g => g.name === selectedGame)
      if (game) {
        const { data: gameData } = await supabase
          .from('games').insert({ name: game.name, genres: [game.genre] }).select().single()
        if (gameData) {
          await supabase.from('library').insert({ user_id: user.id, game_id: gameData.id, status: 'backlog' })
        }
      }
    }

    router.push('/library')
    router.refresh()
  }

  // Shared input / selection style
  const selBtn = (active: boolean) =>
    `flex items-center gap-3 p-3 rounded-[var(--radius-sm)] text-sm font-medium transition-all cursor-pointer ${
      active
        ? 'bg-amber-bg dark:bg-amber-bg-dark text-amber border border-amber/30'
        : 'bg-card dark:bg-card-dark text-ink-muted dark:text-ink-subtle hover:bg-hover dark:hover:bg-hover-dark border border-transparent'
    }`

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md fade-in">

        {/* ── Logo ── */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-ink dark:bg-card-dark rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-base font-black text-amber leading-none">G</span>
          </div>
          <span className="font-serif text-lg font-black tracking-tight text-ink dark:text-ink-dark">GameTrack</span>
        </div>

        {/* ── Progress bar ── */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                flex: i === step ? 2 : 1,
                background: i <= step ? 'var(--color-amber)' : 'var(--color-surface)',
              }}
            />
          ))}
        </div>

        {/* ════════════ STEP 1 — Profil ════════════ */}
        {step === 1 && (
          <div className="fade-in">
            <p className="text-xs font-semibold text-amber uppercase tracking-widest mb-2">Étape 1 sur 3</p>
            <h1 className="font-serif text-3xl font-black tracking-tight mb-2 text-ink dark:text-ink-dark">
              Ton <em className="italic text-amber">profil</em>
            </h1>
            <p className="text-ink-muted dark:text-ink-subtle text-sm mb-8">Comment tu veux qu'on t'appelle ?</p>

            <input
              type="text"
              placeholder="Pseudo"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={24}
              className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20 mb-6"
            />

            <p className="text-xs font-semibold text-ink-muted dark:text-ink-subtle uppercase tracking-wider mb-3">
              Quel type de joueur ?
            </p>
            <div className="grid grid-cols-2 gap-2 mb-8">
              {PLAYER_TYPES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlayerType(p.id)}
                  className={selBtn(playerType === p.id)}
                >
                  <span className="text-xl flex-shrink-0">{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-ink dark:bg-card-dark text-paper dark:text-ink-dark rounded-[var(--radius-sm)] py-3 text-sm font-semibold hover:bg-amber hover:text-black transition-colors"
            >
              Suivant →
            </button>
            <button onClick={() => setStep(2)} className="w-full text-ink-subtle dark:text-ink-subtle text-xs mt-3 py-2 hover:text-ink-muted transition-colors">
              Passer cette étape
            </button>
          </div>
        )}

        {/* ════════════ STEP 2 — Genres ════════════ */}
        {step === 2 && (
          <div className="fade-in">
            <p className="text-xs font-semibold text-amber uppercase tracking-widest mb-2">Étape 2 sur 3</p>
            <h1 className="font-serif text-3xl font-black tracking-tight mb-2 text-ink dark:text-ink-dark">
              Tes <em className="italic text-amber">genres</em> préférés
            </h1>
            <p className="text-ink-muted dark:text-ink-subtle text-sm mb-8">Sélectionne tout ce qui te parle.</p>

            <div className="grid grid-cols-2 gap-2 mb-8">
              {GENRES.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={selBtn(genres.includes(g.id))}
                >
                  <span className="text-xl flex-shrink-0">{g.emoji}</span>
                  <span>{g.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full bg-ink dark:bg-card-dark text-paper dark:text-ink-dark rounded-[var(--radius-sm)] py-3 text-sm font-semibold hover:bg-amber hover:text-black transition-colors"
            >
              Suivant →
            </button>
            <button onClick={() => setStep(3)} className="w-full text-ink-subtle text-xs mt-3 py-2 hover:text-ink-muted transition-colors">
              Passer
            </button>
          </div>
        )}

        {/* ════════════ STEP 3 — Premier jeu ════════════ */}
        {step === 3 && (
          <div className="fade-in">
            <p className="text-xs font-semibold text-amber uppercase tracking-widest mb-2">Étape 3 sur 3</p>
            <h1 className="font-serif text-3xl font-black tracking-tight mb-2 text-ink dark:text-ink-dark">
              Premier <em className="italic text-amber">jeu</em>
            </h1>
            <p className="text-ink-muted dark:text-ink-subtle text-sm mb-8">
              Choisis un jeu pour démarrer ta bibliothèque.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-8">
              {STARTER_GAMES.map(g => {
                const active = selectedGame === g.name
                return (
                  <button
                    key={g.name}
                    onClick={() => setSelectedGame(g.name)}
                    className={`p-3 rounded-[var(--radius-sm)] text-center transition-all border ${
                      active
                        ? 'bg-amber-bg dark:bg-amber-bg-dark border-amber/30'
                        : 'bg-card dark:bg-card-dark border-transparent hover:bg-hover dark:hover:bg-hover-dark'
                    }`}
                  >
                    <div className="text-2xl mb-2 leading-none">{g.emoji}</div>
                    <div className={`font-serif text-xs font-bold leading-tight ${active ? 'text-amber' : 'text-ink dark:text-ink-dark'}`}>
                      {g.name}
                    </div>
                    <div className="text-[10px] text-ink-subtle mt-1">{g.genre}</div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={finish}
              disabled={loading}
              className="w-full bg-ink dark:bg-card-dark text-paper dark:text-ink-dark rounded-[var(--radius-sm)] py-3 text-sm font-semibold hover:bg-amber hover:text-black transition-colors disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Commencer à jouer ✦'}
            </button>
            <button
              onClick={finish}
              className="w-full text-ink-subtle text-xs mt-3 py-2 hover:text-ink-muted transition-colors"
            >
              Passer, j'ajouterai plus tard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}