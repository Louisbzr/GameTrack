'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { user_name: username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper-dark flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center fade-in">
          <div className="text-6xl mb-6">📬</div>
          <h1 className="font-serif text-2xl font-black tracking-tight mb-3 text-ink dark:text-ink-dark">
            Vérifie ton <em className="italic text-amber">email</em>
          </h1>
          <p className="text-ink-muted dark:text-ink-subtle text-sm leading-relaxed mb-6">
            On a envoyé un lien de confirmation à{' '}
            <strong className="text-ink dark:text-ink-dark">{email}</strong>.
            Clique dessus pour activer ton compte.
          </p>
          <p className="text-xs text-ink-subtle">Pas reçu ? Vérifie tes spams.</p>
          <Link
            href="/login"
            className="inline-block mt-6 text-sm text-amber font-semibold hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm fade-in">

        {/* ── Logo ── */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-ink dark:bg-card-dark rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-base font-black text-amber leading-none">G</span>
          </div>
          <span className="font-serif text-lg font-black tracking-tight text-ink dark:text-ink-dark">GameTrack</span>
        </div>

        <h1 className="font-serif text-3xl font-black tracking-tight mb-1 text-ink dark:text-ink-dark">
          Crée ton <em className="text-amber italic">compte</em>
        </h1>
        <p className="text-ink-muted dark:text-ink-subtle text-sm mb-8">Rejoins la communauté GameTrack</p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-sm)] py-3 text-sm font-semibold mb-4 hover:bg-hover dark:hover:bg-hover-dark transition-colors shadow-card"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
          <span className="text-xs text-ink-subtle">ou</span>
          <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Pseudo"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required minLength={3} maxLength={24}
            className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20"
          />
          <input
            type="password"
            placeholder="Mot de passe (min. 8 caractères)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required minLength={8}
            className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20"
          />

          {error && (
            <p className="text-crimson text-xs bg-crimson-bg px-3 py-2 rounded-[var(--radius-sm)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink dark:bg-card-dark text-paper dark:text-ink-dark rounded-[var(--radius-sm)] py-3 text-sm font-semibold hover:bg-amber hover:text-black transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted dark:text-ink-subtle mt-6">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-amber font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}