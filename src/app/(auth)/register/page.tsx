'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gamepad2, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (username.length < 3) { setError('Le pseudo doit faire au moins 3 caractères.'); return }
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }

    setLoading(true)

    // Check username availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle()

    if (existing) {
      setError('Ce pseudo est déjà pris.')
      setLoading(false)
      return
    }

    const { error: registerError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    })

    if (registerError) {
      setError(registerError.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Vérifiez vos emails</h2>
          <p className="text-muted-foreground text-sm">
            Un lien de confirmation a été envoyé à <strong className="text-foreground">{email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <Link href="/login" className="inline-block text-primary text-sm hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/discover` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Gamepad2 className="w-10 h-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">GameTrack</span>
          </div>
          <p className="text-muted-foreground text-sm">Créez votre compte gratuitement</p>
        </div>

        <div className="glass rounded-2xl p-8 border border-border space-y-5">
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Pseudo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                  required
                  placeholder="votre_pseudo"
                  maxLength={20}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="vous@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="8 caractères minimum"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= [4,6,8,12][i]
                        ? ['bg-red-400','bg-orange-400','bg-yellow-400','bg-primary'][i]
                        : 'bg-secondary'
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : 'Créer mon compte'
              }
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            En créant un compte, vous acceptez nos{' '}
            <span className="text-primary cursor-pointer hover:underline">conditions d'utilisation</span>.
          </p>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-transparent text-muted-foreground" style={{backgroundColor:'hsl(var(--surface-glass))'}}>ou continuer avec</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-secondary/30 text-foreground text-sm font-medium hover:bg-secondary/60 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}