import { searchGames } from '@/lib/rawg'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  if (query.length < 2) return NextResponse.json([])

  const supabase = await createClient()

  // 1. Cherche d'abord dans le cache Supabase
  const { data: cached } = await supabase
    .from('games')
    .select('rawg_id, name, slug, cover_url, genres, released_at, metacritic')
    .ilike('name', `%${query}%`)
    .not('rawg_id', 'is', null)
    .limit(6)

  // 2. Cherche sur RAWG
  const rawgResults = await searchGames(query)

  // 3. Sauvegarde les nouveaux jeux en cache silencieusement
  if (rawgResults.length > 0) {
    const toUpsert = rawgResults.map(g => ({
        rawg_id: g.id,
        name: g.name,
        slug: g.slug,
        cover_url: g.background_image,
        genres: g.genres.map(genre => genre.name),
        platforms: g.platforms?.map(p => p.platform.name) || [],
        released_at: g.released,
        metacritic: g.metacritic,
    }))
    await supabase
      .from('games')
      .upsert(toUpsert, { onConflict: 'rawg_id', ignoreDuplicates: true })
  }

  // 4. Merge : RAWG en priorité, complété par le cache
  const rawgIds = new Set(rawgResults.map(g => g.id))
  const cachedExtra = (cached || []).filter(c => !rawgIds.has(c.rawg_id))

  const combined = [
    ...rawgResults.map(g => ({
      rawgId: g.id,
      name: g.name,
      slug: g.slug,
      coverUrl: g.background_image,
      genres: g.genres.map(genre => genre.name),
      released: g.released,
      metacritic: g.metacritic,
    })),
    ...cachedExtra.map(c => ({
      rawgId: c.rawg_id,
      name: c.name,
      slug: c.slug,
      coverUrl: c.cover_url,
      genres: c.genres || [],
      released: c.released_at,
      metacritic: c.metacritic,
    })),
  ]

  return NextResponse.json(combined.slice(0, 12))
}