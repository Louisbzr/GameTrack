'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push('/library')
    router.refresh()
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
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

        {/* ── Heading ── */}
        <h1 className="font-serif text-3xl font-black tracking-tight mb-1 text-ink dark:text-ink-dark">
          Bon retour <em className="text-amber italic">joueur</em>
        </h1>
        <p className="text-ink-muted dark:text-ink-subtle text-sm mb-8">
          Connecte-toi pour accéder à ta bibliothèque
        </p>

        {/* ── Google OAuth ── */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-card dark:bg-card-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] py-3 text-sm font-semibold mb-4 hover:bg-hover dark:hover:bg-hover-dark transition-colors shadow-card border border-surface dark:border-surface-dark"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
          <span className="text-xs text-ink-subtle">ou</span>
          <div className="flex-1 h-px bg-surface dark:bg-surface-dark" />
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-card dark:bg-card-dark text-ink dark:text-ink-dark border border-surface dark:border-surface-dark rounded-[var(--radius-sm)] px-4 py-3 pr-12 text-sm outline-none transition-all placeholder:text-ink-subtle focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink dark:hover:text-ink-dark transition-colors"
            >
              {showPassword ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-crimson text-xs bg-crimson-bg px-3 py-2 rounded-[var(--radius-sm)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink dark:bg-card-dark text-paper dark:text-ink-dark rounded-[var(--radius-sm)] py-3 text-sm font-semibold hover:bg-amber hover:text-black transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted dark:text-ink-subtle mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-amber font-semibold hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}