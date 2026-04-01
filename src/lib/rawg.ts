const BASE = 'https://api.rawg.io/api'
const KEY = process.env.RAWG_API_KEY

export interface RawgGame {
  id: number
  name: string
  slug: string
  background_image: string | null
  genres: { name: string }[]
  platforms: { platform: { name: string } }[] | null
  released: string | null
  metacritic: number | null
  rating: number
}

export async function searchGames(query: string): Promise<RawgGame[]> {
  if (!query || query.length < 2) return []
  const res = await fetch(
    `${BASE}/games?key=${KEY}&search=${encodeURIComponent(query)}&page_size=12&search_precise=true`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.results || []
}

export async function getGame(rawgId: number): Promise<RawgGame | null> {
  const res = await fetch(
    `${BASE}/games/${rawgId}?key=${KEY}`,
    { next: { revalidate: 86400 } }
  )
  if (!res.ok) return null
  return res.json()
}

export interface RawgGame {
  id: number
  name: string
  slug: string
  background_image: string | null
  genres: { name: string }[]
  platforms: { platform: { name: string } }[] | null
  released: string | null
  metacritic: number | null
  rating: number
}