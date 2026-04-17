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

async function igdb(endpoint: string, body: string) {
  const token = await getTwitchToken()
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.IGDB_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`IGDB ${endpoint} failed: ${res.status}`)
  return res.json()
}

function coverUrl(imageId: string | undefined): string | null {
  if (!imageId) return null
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    fromTs: Math.floor(monday.getTime() / 1000),
    toTs:   Math.floor(sunday.getTime() / 1000),
    from:   monday.toISOString().split('T')[0],
    to:     sunday.toISOString().split('T')[0],
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam   = searchParams.get('to')

    let fromTs: number, toTs: number, from: string, to: string
    if (fromParam && toParam) {
      from   = fromParam
      to     = toParam
      fromTs = Math.floor(new Date(from).getTime() / 1000)
      toTs   = Math.floor(new Date(to + 'T23:59:59').getTime() / 1000)
    } else {
      const range = getWeekRange()
      fromTs = range.fromTs; toTs = range.toTs; from = range.from; to = range.to
    }

    // first_release_date = vraie première sortie du jeu, pas les sorties sur nouvelles plateformes
    const games = await igdb('games', `
      fields
        name,
        cover.image_id,
        genres.name,
        platforms.name,
        first_release_date,
        rating,
        rating_count,
        category;
      where first_release_date >= ${fromTs}
        & first_release_date <= ${toTs}
        & (category = (0,8,9,10) | category = null);
      sort first_release_date asc;
      limit 500;
    `)

    if (!games?.length) {
      return NextResponse.json({ results: [], from, to })
    }

    const today = new Date().toISOString().slice(0, 10)

    const results = (games as any[])
      .map((g: any) => {
        const categoryLabel =
          g.category === 8  ? 'Remake'           :
          g.category === 9  ? 'Remaster'          :
          g.category === 10 ? 'Extended Edition'  :
          null
        return {
          igdb_id:        g.id,
          name:           g.name,
          cover_url:      coverUrl(g.cover?.image_id),
          released:       g.first_release_date
            ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
            : null,
          genres:         (g.genres    ?? []).map((x: any) => x.name),
          platforms:      (g.platforms ?? []).map((p: any) => p.name),
          metacritic:     g.rating ? Math.round(g.rating) : null,
          rating_count:   g.rating_count ?? 0,
          category_label: categoryLabel,
        }
      })
      .sort((a, b) => {
        const aToday = a.released === today ? 1 : 0
        const bToday = b.released === today ? 1 : 0
        if (bToday !== aToday) return bToday - aToday
        return b.rating_count - a.rating_count
      })

    return NextResponse.json({ results, from, to })
  } catch (err) {
    console.error('Weekly releases error:', err)
    return NextResponse.json({ results: [] })
  }
}