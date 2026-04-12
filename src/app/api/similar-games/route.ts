import { NextResponse } from 'next/server'

let cachedToken: string | null = null
let tokenExpiry = 0

async function getTwitchToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  if (!res.ok) throw new Error('Twitch token failed')
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000
  return cachedToken!
}

async function igdbPost(body: string) {
  const token = await getTwitchToken()
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': process.env.IGDB_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })
  if (!res.ok) return []
  return res.json()
}

function coverUrl(imageId: string | undefined): string | null {
  if (!imageId) return null
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
}

function mapGame(g: any) {
  return {
    id:          String(g.id),
    igdb_id:     g.id,
    name:        g.name,
    cover_url:   coverUrl(g.cover?.image_id),
    released_at: g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
      : null,
    genres:      (g.genres ?? []).map((x: any) => x.name),
    rating:      g.rating ? Math.round(g.rating) / 20 : null,
    rating_count: g.rating_count ?? 0,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name   = searchParams.get('name') ?? ''
    const igdbId = searchParams.get('igdb_id')

    if (!name && !igdbId) return NextResponse.json({ results: [] })

    // 1. Trouver le jeu principal pour avoir ses genres + similar_games
    let mainGame: any = null

    if (igdbId) {
      const res = await igdbPost(
        `fields similar_games, genres.id, genres.name; where id = ${igdbId}; limit 1;`
      )
      mainGame = res[0] ?? null
    }

    if (!mainGame && name) {
      const q = name.replace(/"/g, '')
      const res = await igdbPost(
        `search "${q}"; fields name, similar_games, genres.id, genres.name; where version_parent = null; limit 5;`
      )
      const exact = res.find((r: any) => r.name?.toLowerCase() === name.toLowerCase())
      mainGame = exact ?? res[0] ?? null
    }

    const genreIds: number[] = (mainGame?.genres ?? []).map((g: any) => g.id ?? g)
    const similarIds: number[] = mainGame?.similar_games ?? []

    // 2. Récupérer les jeux similaires IGDB
    let similarGames: any[] = []
    if (similarIds.length > 0) {
      const details = await igdbPost(
        `fields name, cover.image_id, genres.name, first_release_date, rating, rating_count;
         where id = (${similarIds.slice(0, 10).join(',')}) & cover != null;
         limit 10;`
      )
      similarGames = details.map(mapGame)
    }

    // 3. Évaluer la qualité : si les similar_games ont peu de rating_count, on les complète
    const avgRatingCount = similarGames.length > 0
      ? similarGames.reduce((s, g) => s + g.rating_count, 0) / similarGames.length
      : 0

    let genreGames: any[] = []
    if (genreIds.length > 0 && (similarGames.length < 4 || avgRatingCount < 50)) {
      const excludeIds = [
        ...(igdbId ? [Number(igdbId)] : []),
        ...similarIds,
      ]
      const excludeClause = excludeIds.length > 0 ? `& id != (${excludeIds.slice(0, 20).join(',')})` : ''

      // Essayer d'abord avec TOUS les genres (AND strict = vrais similaires)
      let genreRes: any[] = []
      if (genreIds.length >= 2) {
        genreRes = await igdbPost(
          `fields name, cover.image_id, genres.name, first_release_date, rating, rating_count;
           where genres = [${genreIds.join(',')}]
             & cover != null
             & rating_count > 10
             ${excludeClause};
           sort rating_count desc;
           limit 12;`
        )
      }

      // Si pas assez de résultats, fallback avec les 2 genres principaux
      if (genreRes.length < 4 && genreIds.length >= 2) {
        genreRes = await igdbPost(
          `fields name, cover.image_id, genres.name, first_release_date, rating, rating_count;
           where genres = [${genreIds.slice(0, 2).join(',')}]
             & cover != null
             & rating_count > 10
             ${excludeClause};
           sort rating_count desc;
           limit 12;`
        )
      }

      genreGames = genreRes.map(mapGame)
    }

    // 4. Fusionner : similar_games d'abord (s'ils sont bons), puis genre-based
    const seen = new Set<number>()
    const final: any[] = []

    // Garder les similar_games qui ont au moins quelques ratings
    for (const g of similarGames.filter(g => g.rating_count >= 20)) {
      if (!seen.has(g.igdb_id)) { seen.add(g.igdb_id); final.push(g) }
    }

    // Compléter avec les jeux par genre
    for (const g of genreGames) {
      if (!seen.has(g.igdb_id)) { seen.add(g.igdb_id); final.push(g) }
      if (final.length >= 8) break
    }

    // Si encore vide, prendre les similar_games même sans ratings
    if (final.length === 0) {
      for (const g of similarGames) {
        if (!seen.has(g.igdb_id)) { seen.add(g.igdb_id); final.push(g) }
      }
    }

    return NextResponse.json({ results: final.slice(0, 8) })
  } catch (err) {
    console.error('similar-games error:', err)
    return NextResponse.json({ results: [] })
  }
}