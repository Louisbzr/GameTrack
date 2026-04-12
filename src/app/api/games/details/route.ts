import { NextRequest, NextResponse } from 'next/server'

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

async function igdbPost(endpoint: string, body: string) {
  const token = await getTwitchToken()
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.IGDB_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })
  if (!res.ok) { console.error(`[IGDB] ${endpoint} failed:`, res.status, await res.text()); return null }
  return res.json()
}

async function findOriginalIgdbId(gameName: string): Promise<number | null> {
  const safe = gameName.replace(/"/g, '').trim()
  const nameLower = safe.toLowerCase()

  // 1. Exact name, no category restriction, oldest first
  const exact = await igdbPost('games',
    `fields id, name, first_release_date, category; where name = "${safe}"; sort first_release_date asc; limit 5;`
  )
  if (exact?.length) {
    // Among exact matches, prefer category 0, then oldest
    const mainGames = exact.filter((g: any) => g.category === 0)
    const best = mainGames[0] ?? exact[0]
    console.log(`[IGDB] exact: "${best.name}" (${best.id}) cat=${best.category} ${best.first_release_date ? new Date(best.first_release_date * 1000).getFullYear() : '?'}`)
    return best.id
  }

  // 2. Fuzzy search — score results carefully
  const fuzzy = await igdbPost('games',
    `search "${safe}"; fields id, name, first_release_date, category; limit 20;`
  )
  if (!fuzzy?.length) return null

  const scored = fuzzy.map((g: any) => {
    let score = 0
    const gNameLower = (g.name ?? '').toLowerCase()

    // Exact name match — highest bonus
    if (gNameLower === nameLower) {
      score += 200
    } else if (gNameLower.startsWith(nameLower + ':') || gNameLower.startsWith(nameLower + ' -')) {
      // Has subtitle/colon (e.g. "Super Mario Kart: Demake") — much lower than exact
      score += 30
    } else if (gNameLower.startsWith(nameLower)) {
      score += 25
    } else if (gNameLower.includes(nameLower)) {
      score += 10
    }

    // Penalize names significantly longer than search (subtitles, demakes, remakes with extra words)
    const extraWords = gNameLower.replace(nameLower, '').trim().split(' ').filter(Boolean).length
    score -= extraWords * 15

    // Category bonuses
    if (g.category === 0) score += 50
    else if (g.category === 8 || g.category === 9) score += 15

    // Age bonus: prefer older games (likely originals) — only when name score is decent
    if (g.first_release_date && score > 50) {
      const year = new Date(g.first_release_date * 1000).getFullYear()
      // Add up to 30 pts for very old games, subtract for recent
      score += Math.max(-20, Math.min(30, (2000 - year) * 0.5))
    }

    return { ...g, score }
  })

  scored.sort((a: any, b: any) => b.score - a.score)
  const best = scored[0]
  console.log(`[IGDB] best: "${best.name}" (${best.id}) cat=${best.category} score=${best.score.toFixed(1)} year=${best.first_release_date ? new Date(best.first_release_date * 1000).getFullYear() : '?'}`)
  console.log(`[IGDB] top5:`, scored.slice(0, 5).map((g: any) => `"${g.name}" score=${g.score.toFixed(1)}`).join(' | '))
  return best.id
}

async function fetchMediaForId(id: number) {
  const [screenshotsRaw, videosRaw, artworksRaw] = await Promise.all([
    igdbPost('screenshots', `fields image_id; where game = ${id}; limit 20;`),
    igdbPost('game_videos',  `fields video_id, name; where game = ${id}; limit 10;`),
    igdbPost('artworks',     `fields image_id; where game = ${id}; limit 10;`),
  ])
  return { screenshotsRaw, videosRaw, artworksRaw }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  try {
    const igdbId = await findOriginalIgdbId(name)
    if (!igdbId) return NextResponse.json({ error: 'Game not found on IGDB' }, { status: 404 })

    // Fetch game details (include parent_game + versions for media fallback)
    const [games, primaryMedia] = await Promise.all([
      igdbPost('games', `
        fields
          name, summary, first_release_date, category, cover.image_id,
          genres.name, platforms.name,
          involved_companies.company.name,
          involved_companies.developer,
          involved_companies.publisher,
          similar_games.id, similar_games.name,
          similar_games.cover.image_id,
          similar_games.first_release_date,
          similar_games.genres.name,
          similar_games.platforms.name,
          websites.category, websites.url,
          parent_game,
          version_parent,
          aggregated_rating, aggregated_rating_count,
          total_rating, total_rating_count;
        where id = ${igdbId};
        limit 1;
      `),
      fetchMediaForId(igdbId),
    ])

    if (!games?.length) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const g = games[0]
    let { screenshotsRaw, videosRaw, artworksRaw } = primaryMedia

    // If missing media, try parent_game or version_parent IDs
    const parentId: number | null = g.parent_game ?? g.version_parent ?? null
    const missingMedia = (!videosRaw?.length || !screenshotsRaw?.length) && parentId

    if (missingMedia) {
      console.log(`[IGDB] media incomplete for ${igdbId}, trying parent ${parentId}`)
      const parentMedia = await fetchMediaForId(parentId!)
      if (!videosRaw?.length && parentMedia.videosRaw?.length)       videosRaw = parentMedia.videosRaw
      if (!screenshotsRaw?.length && parentMedia.screenshotsRaw?.length) screenshotsRaw = parentMedia.screenshotsRaw
      if (!artworksRaw?.length && parentMedia.artworksRaw?.length)   artworksRaw = parentMedia.artworksRaw
    }

    // Also try fetching all versions of this game for media if still missing
    if (!videosRaw?.length || !screenshotsRaw?.length) {
      const safe = g.name.replace(/"/g, '').trim()
      const allVersions = await igdbPost('games',
        `fields id; where name = "${safe}" & (videos != null | screenshots != null); sort first_release_date asc; limit 5;`
      )
      if (allVersions?.length) {
        for (const v of allVersions) {
          if (v.id === igdbId) continue
          const vMedia = await fetchMediaForId(v.id)
          if (!videosRaw?.length && vMedia.videosRaw?.length)           videosRaw = vMedia.videosRaw
          if (!screenshotsRaw?.length && vMedia.screenshotsRaw?.length) screenshotsRaw = vMedia.screenshotsRaw
          if (!artworksRaw?.length && vMedia.artworksRaw?.length)       artworksRaw = vMedia.artworksRaw
          if (videosRaw?.length && screenshotsRaw?.length) break
        }
      }
    }

    const companies = Array.isArray(g.involved_companies) ? g.involved_companies : []
    const developer = companies.find((c: any) => c.developer)?.company?.name ?? null
    const publisher = companies.find((c: any) => c.publisher)?.company?.name ?? null

    let releaseDate: string | null = null
    let releaseYear: number | null = null
    if (g.first_release_date) {
      const d = new Date(g.first_release_date * 1000)
      releaseDate = d.toISOString()
      releaseYear = d.getFullYear()
    }

    const platforms    = Array.isArray(g.platforms) ? g.platforms.map((p: any) => p.name).filter(Boolean) : []
    const genres       = Array.isArray(g.genres)    ? g.genres.map((gn: any) => gn.name).filter(Boolean) : []
    const cover_url    = g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null
    const websitesList = Array.isArray(g.websites) ? g.websites : []

    const screenshots = Array.isArray(screenshotsRaw)
      ? screenshotsRaw.map((s: any) => ({
          url:   `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`,
          thumb: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${s.image_id}.jpg`,
        }))
      : []

    const videos = Array.isArray(videosRaw)
      ? videosRaw.map((v: any) => ({
          title:     v.name ?? 'Vidéo',
          videoId:   v.video_id,
          thumbnail: `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`,
          url:       `https://www.youtube.com/watch?v=${v.video_id}`,
        }))
      : []

    const artworks = Array.isArray(artworksRaw)
      ? artworksRaw.map((a: any) => ({
          url:   `https://images.igdb.com/igdb/image/upload/t_1080p/${a.image_id}.jpg`,
          thumb: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${a.image_id}.jpg`,
        }))
      : []

    const similarGames = Array.isArray(g.similar_games)
      ? g.similar_games.slice(0, 12).map((sg: any) => ({
          id: String(sg.id), igdb_id: sg.id, name: sg.name,
          cover_url: sg.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${sg.cover.image_id}.jpg` : null,
          released_at: sg.first_release_date ? new Date(sg.first_release_date * 1000).toISOString() : null,
          genres: Array.isArray(sg.genres) ? sg.genres.map((gn: any) => gn.name) : [],
          platforms: Array.isArray(sg.platforms) ? sg.platforms.map((p: any) => p.name) : [],
        }))
      : []

    console.log(`[IGDB details] ✓ ${g.name} | id=${igdbId} | ${releaseYear} | dev=${developer} | screens=${screenshots.length} videos=${videos.length} artworks=${artworks.length}`)

    return NextResponse.json({
      igdb_id: igdbId,
      name: g.name,
      description: g.summary ?? null,
      releaseDate, releaseYear, cover_url, developer, publisher, platforms, genres,
      screenshots, videos, artworks,
      similarGames,
      websites: {
        official:  websitesList.find((w: any) => w.category === 1)?.url  ?? null,
        steam:     websitesList.find((w: any) => w.category === 13)?.url ?? null,
        wikipedia: websitesList.find((w: any) => w.category === 3)?.url  ?? null,
      },
    })
  } catch (err) {
    console.error('[IGDB details]', err)
    return NextResponse.json({ error: 'IGDB fetch failed' }, { status: 500 })
  }
}