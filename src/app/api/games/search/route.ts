import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getTwitchToken(): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST', cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`Twitch token failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function igdbFetch(token: string, body: string): Promise<any[]> {
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': process.env.IGDB_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function coverUrl(imageId: string | undefined): string | null {
  if (!imageId) return null
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
}

// Normalise les accents : "Pokem" → match "Pokémon"
function normalizeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const FIELDS = `fields name, cover.image_id, genres.name, platforms.name, first_release_date, rating, rating_count, slug;`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  try {
    const token = await getTwitchToken()
    const safe  = q.replace(/"/g, '').replace(/\*/g, '')

    // 3 requêtes en parallèle pour maximiser les résultats
    const queries = await Promise.all([
      // 1. Full-text search (gère les accents et la pertinence)
      igdbFetch(token, `search "${safe}"; ${FIELDS} limit 500;`),
      // 2. Name contains exact (pour les termes sans accents)
      igdbFetch(token, `${FIELDS} where name ~ *"${safe}"*; sort rating_count desc; limit 500;`),
      // 3. Name contains normalisé si différent (ex: "Pokem" → cherche aussi "Pokém")
      ...(normalizeAccents(safe) !== safe ? [] : [
        igdbFetch(token, `${FIELDS} where name ~ *"${safe.replace(/e/gi, 'é')}"*; sort rating_count desc; limit 100;`)
      ]),
    ])

    // Fusionner et dédupliquer
    const seen   = new Set<number>()
    const merged: any[] = []
    for (const list of queries) {
      for (const g of list) {
        if (g.id && g.name && !seen.has(g.id)) {
          seen.add(g.id)
          merged.push(g)
        }
      }
    }

    // Trier par rating_count desc → les plus connus en premier
    const sorted = merged
      .sort((a, b) => (b.rating_count ?? 0) - (a.rating_count ?? 0))
      .slice(0, 200)

    // Jeux déjà en DB
    const supabase = await createClient()
    const { data: cached } = await supabase
      .from('games')
      .select('id, igdb_id')
      .in('igdb_id', sorted.map(g => g.id))

    const results = sorted.map(g => {
      const cachedGame = cached?.find(c => c.igdb_id === g.id)
      return {
        igdbId:     g.id,
        name:       g.name,
        slug:       g.slug ?? '',
        coverUrl:   coverUrl(g.cover?.image_id),
        genres:     (g.genres    ?? []).map((x: any) => x.name),
        platforms:  (g.platforms ?? []).map((p: any) => p.name),
        released:   g.first_release_date
          ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
          : null,
        metacritic: g.rating ? Math.round(g.rating) : null,
        existingId: cachedGame?.id ?? null,
      }
    })

    return NextResponse.json(results)
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json([])
  }
}