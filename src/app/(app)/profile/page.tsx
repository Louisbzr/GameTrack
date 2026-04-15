// src/app/(app)/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .maybeSingle()

    if (!profile || !profile.onboarded) {
      if (!profile) {
        const rawUsername = user!.email?.split('@')[0] ?? ''
        const username = rawUsername.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20) || `user_${user!.id.slice(0, 8)}`
        await supabase.from('profiles').upsert({
          id:           user!.id,
          username,
          avatar_color: 'forest',
          onboarded:    false,
          level:        1,
          xp:           0,
        }, { onConflict: 'id', ignoreDuplicates: true })
      }
      redirect('/onboarding')
    }

    const [
      { data: library },
      { data: badges },
      { data: xpHistory },
    ] = await Promise.all([
      supabase
        .from('library')
        .select('id, status, rating, review, is_favorite, updated_at, games(id, name, cover_url, genres, platforms)')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase
        .from('user_badges')
        .select('badge_slug, earned_at')
        .eq('user_id', user!.id),
      supabase
        .from('xp_transactions')
        .select('amount, reason, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const lib       = (library ?? []).filter(Boolean)
    const total     = lib.length
    const completed = lib.filter((l: any) => l.status === 'completed').length
    const playing   = lib.filter((l: any) => l.status === 'playing').length
    const ratings   = lib.map((l: any) => l.rating).filter(Boolean)
    const avgRating = ratings.length
      ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length / 2).toFixed(1)
      : '—'

    return (
      <ProfileClient
        profile={profile}
        library={lib}
        badges={badges ?? []}
        xpHistory={xpHistory ?? []}
        stats={{ total, completed, playing, avgRating }}
      />
    )
  } catch (err) {
    console.error('[/profile]', err)
    redirect('/login?error=' + encodeURIComponent('Erreur lors du chargement du profil.'))
  }
}