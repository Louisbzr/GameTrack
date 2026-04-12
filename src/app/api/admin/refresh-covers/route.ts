import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

let cachedToken: string | null = null
let tokenExpiry = 0

async function getTwitchToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000
  return cachedToken!
}

async function igdbSearch(name: string): Promise<{ igdb_id: number; cover_url: string | null } | null> {
  const token = await getTwitchToken()
  const safe  = name.replace(/"/g, '').replace(/[^\w\s:]/g, '').trim()
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': process.env.IGDB_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: `search "${safe}"; fields name, cover.image_id; where version_parent = null; limit 1;`,
  })
  if (!res.ok) return null
  const games = await res.json()
  if (!games?.length) return null
  const g = games[0]
  const cover_url = g.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
    : null
  return { igdb_id: g.id, cover_url }
}

export async function GET() {
  const supabase = await createClient()

  // Seulement les jeux sans cover (RAWG supprimés via SQL)
  const { data: games, error } = await supabase
    .from('games')
    .select('id, name')
    .is('cover_url', null)
    .order('name')

  if (error || !games) {
    return NextResponse.json({ error: 'Impossible de charger les jeux' }, { status: 500 })
  }

  if (games.length === 0) {
    return NextResponse.json({ message: 'Tous les jeux ont déjà une cover', total: 0 })
  }

  const results: { name: string; status: string }[] = []
  let updated = 0
  let failed  = 0

  for (const game of games) {
    try {
      await new Promise(r => setTimeout(r, 260))
      const igdbData = await igdbSearch(game.name)

      if (!igdbData?.cover_url) {
        results.push({ name: game.name, status: 'no_cover' })
        failed++
        continue
      }

      await supabase
        .from('games')
        .update({ cover_url: igdbData.cover_url, igdb_id: igdbData.igdb_id })
        .eq('id', game.id)

      results.push({ name: game.name, status: 'updated' })
      updated++
    } catch {
      results.push({ name: game.name, status: 'error' })
      failed++
    }
  }

  return NextResponse.json({ total: games.length, updated, failed, results })
}