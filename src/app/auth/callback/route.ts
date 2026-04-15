import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // ── Auth provider returned an error ──────────────────────────────────────
  if (error) {
    const msg = errorDescription ?? error
    console.error('[auth/callback] Provider error:', msg)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(msg)}`
    )
  }

  // ── No code — invalid callback ────────────────────────────────────────────
  if (!code) {
    console.error('[auth/callback] Missing code')
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Lien de connexion invalide. Réessaie.')}`
    )
  }

  // ── Exchange code for session ─────────────────────────────────────────────
  try {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    // ── Get user & profile ─────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Session introuvable. Réessaie.')}`
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded, username')
      .eq('id', user.id)
      .maybeSingle()

    // ── Redirect logic ─────────────────────────────────────────────────────
    // Profile doesn't exist or onboarding not complete → onboarding
    if (!profile || !profile.onboarded) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    // Happy path → discover (home for logged-in users)
    return NextResponse.redirect(`${origin}/discover`)

  } catch (err: any) {
    console.error('[auth/callback] Unexpected error:', err)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Erreur inattendue. Réessaie dans quelques secondes.')}`
    )
  }
}