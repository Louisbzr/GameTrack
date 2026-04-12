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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name   = searchParams.get('name') ?? ''
    const igdbId = searchParams.get('igdb_id')

    if (!name) return NextResponse.json({ platforms: [] })

    const token = await getTwitchToken()
    const headers = {
      'Client-ID': process.env.IGDB_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    }

    // Toujours chercher par nom d'abord (version_parent = null = jeu principal uniquement)
    const q = name.replace(/"/g, '')
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST', headers,
      body: `search "${q}"; fields name, platforms.name, first_release_date; where version_parent = null; limit 10;`,
    })

    let platforms: string[] = []

    if (res.ok) {
      const results: any[] = await res.json()

      // 1. Match exact sur le nom
      const exact = results.find(
        r => r.name?.toLowerCase() === name.toLowerCase()
      )

      if (exact) {
        platforms = (exact.platforms ?? []).map((p: any) => p.name)
      } else {
        // 2. Match partiel : nom contient le titre recherché
        const partial = results.find(
          r => r.name?.toLowerCase().includes(name.toLowerCase()) ||
               name.toLowerCase().includes(r.name?.toLowerCase())
        )
        if (partial) {
          platforms = (partial.platforms ?? []).map((p: any) => p.name)
        } else if (results[0]) {
          platforms = (results[0].platforms ?? []).map((p: any) => p.name)
        }
      }
    }

    // Fallback : fetch direct par igdb_id si le nom n'a rien donné
    if (!platforms.length && igdbId) {
      const res2 = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST', headers,
        body: `fields platforms.name; where id = ${igdbId} & version_parent = null; limit 1;`,
      })
      if (res2.ok) {
        const data = await res2.json()
        platforms = (data[0]?.platforms ?? []).map((p: any) => p.name)
      }
    }

    return NextResponse.json({ platforms })
  } catch (err) {
    console.error('enrich-platforms error:', err)
    return NextResponse.json({ platforms: [] })
  }
}