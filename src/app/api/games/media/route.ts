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

export async function GET(req: NextRequest) {
  const igdbId = req.nextUrl.searchParams.get('igdb_id')
  if (!igdbId) return NextResponse.json({ screenshots: [], videos: [] })

  const token = await getTwitchToken()
  const headers = {
    'Client-ID': process.env.IGDB_CLIENT_ID!,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'text/plain',
  }

  const [screenshotsRes, videosRes] = await Promise.all([
    fetch('https://api.igdb.com/v4/screenshots', {
      method: 'POST', headers,
      body: `fields image_id; where game = ${igdbId}; limit 12;`,
    }),
    fetch('https://api.igdb.com/v4/game_videos', {
      method: 'POST', headers,
      body: `fields video_id, name; where game = ${igdbId}; limit 5;`,
    }),
  ])

  const [screenshotsData, videosData] = await Promise.all([
    screenshotsRes.json(),
    videosRes.json(),
  ])

  const screenshots = (Array.isArray(screenshotsData) ? screenshotsData : []).map((s: any) => ({
    url: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`,
    thumb: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${s.image_id}.jpg`,
  }))

  const videos = (Array.isArray(videosData) ? videosData : []).map((v: any) => ({
    videoId: v.video_id,
    name: v.name ?? 'Trailer',
  }))

  return NextResponse.json({ screenshots, videos })
}