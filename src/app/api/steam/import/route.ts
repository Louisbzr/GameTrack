import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number
}

interface ImportResult {
  imported: number
  skipped: number
  errors: number
  details: string[]
}

// ── IGDB auth ──────────────────────────────────────────────────────────────

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

async function searchIGDB(name: string): Promise<{
  igdb_id: number
  name: string
  cover_url: string | null
  genres: string[]
  released_at: string | null
  metacritic: number | null
} | null> {
  try {
    const token = await getTwitchToken()
    const safe  = name.replace(/"/g, '').replace(/[^\w\s:]/g, '').trim()

    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID':     process.env.IGDB_CLIENT_ID!,
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'text/plain',
      },
      body: `search "${safe}"; fields name, cover.image_id, genres.name, first_release_date, aggregated_rating; where version_parent = null; limit 1;`,
    })

    if (!res.ok) return null
    const games = await res.json()
    if (!games?.length) return null

    const g = games[0]
    const cover_url = g.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
      : null
    const released_at = g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString().split('T')[0]
      : null
    const metacritic = g.aggregated_rating ? Math.round(g.aggregated_rating) : null
    const genres = g.genres?.map((genre: any) => genre.name) ?? []

    return { igdb_id: g.id, name: g.name || name, cover_url, genres, released_at, metacritic }
  } catch {
    return null
  }
}

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { userId, games, steamId } = (await request.json()) as {
      userId: string
      games: SteamGame[]
      steamId: string
    }

    if (!userId || !Array.isArray(games)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const result: ImportResult = { imported: 0, skipped: 0, errors: 0, details: [] }

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, '').trim()

    // Étape 1 : récupère tous les game_ids de la bibliothèque
    const { data: libEntries } = await supabase
      .from('library')
      .select('game_id')
      .eq('user_id', userId)

    const existingGameIds = (libEntries ?? []).map((l: any) => l.game_id).filter(Boolean)

    // Étape 2 : récupère les noms de ces jeux
    const libraryNameToGameId = new Map<string, string>()
    if (existingGameIds.length > 0) {
      const { data: gameNames } = await supabase
        .from('games')
        .select('id, name')
        .in('id', existingGameIds)

      for (const g of gameNames ?? []) {
        if (g.name) libraryNameToGameId.set(normalize(g.name), g.id)
      }
    }
    const libraryNormalizedNames = new Set(libraryNameToGameId.keys())

    for (const sg of games) {
      try {
        const steamCoverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${sg.appid}/library_600x900.jpg`
        const existingGameId = libraryNameToGameId.get(normalize(sg.name)) ?? null
        const alreadyInLibrary = existingGameId !== null

        // Enrichissement IGDB — toujours exécuté pour mettre à jour les données RAWG → IGDB
        const igdb = await searchIGDB(sg.name)
        let gameId: string | null = existingGameId

        if (igdb) {
          if (alreadyInLibrary && existingGameId) {
            // Jeu déjà en bibliothèque : on met à jour le record existant avec IGDB
            await supabase.from('games').update({
              igdb_id:     igdb.igdb_id,
              name:        sg.name,
              cover_url:   steamCoverUrl,
              genres:      igdb.genres,
              released_at: igdb.released_at,
              metacritic:  igdb.metacritic,
            }).eq('id', existingGameId)
          } else {
            // Nouveau jeu : cherche par igdb_id puis par nom, sinon insert
            const { data: byIgdb } = await supabase
              .from('games').select('id').eq('igdb_id', igdb.igdb_id).maybeSingle()

            if (byIgdb?.id) {
              gameId = byIgdb.id
            } else {
              const { data: byName } = await supabase
                .from('games').select('id').ilike('name', sg.name).maybeSingle()

              if (byName?.id) {
                gameId = byName.id
                await supabase.from('games').update({
                  igdb_id: igdb.igdb_id, cover_url: steamCoverUrl,
                  genres: igdb.genres, released_at: igdb.released_at, metacritic: igdb.metacritic,
                }).eq('id', gameId)
              } else {
                const { data: inserted } = await supabase
                  .from('games')
                  .insert({
                    igdb_id: igdb.igdb_id, name: sg.name,
                    cover_url: steamCoverUrl,
                    genres: igdb.genres, released_at: igdb.released_at, metacritic: igdb.metacritic,
                  })
                  .select('id').single()
                gameId = inserted?.id ?? null
              }
            }
          }
        } else if (!alreadyInLibrary) {
          // Pas trouvé sur IGDB et pas en bibliothèque → insert minimal
          const { data: byName } = await supabase
            .from('games').select('id').ilike('name', sg.name).maybeSingle()
          if (byName?.id) {
            gameId = byName.id
          } else {
            const { data: ins, error: insErr } = await supabase
              .from('games').insert({ name: sg.name, cover_url: steamCoverUrl, genres: [] })
              .select('id').single()
            if (insErr || !ins) {
              result.errors++
              result.details.push(`${sg.name}: ${insErr?.message ?? 'insert échoué'}`)
              continue
            }
            gameId = ins.id
          }
        }

        if (!gameId) {
          result.errors++
          result.details.push(`${sg.name}: impossible de résoudre le game_id`)
          continue
        }

        // 3. Si déjà en bibliothèque → mise à jour IGDB faite, on skip l'insert
        if (alreadyInLibrary) {
          result.skipped++
          continue
        }

        // 4. Vérification finale par game_id (contrainte unique)
        const { data: inLibFinal } = await supabase
          .from('library').select('id')
          .eq('user_id', userId).eq('game_id', gameId).maybeSingle()

        if (inLibFinal) {
          result.skipped++
          libraryNormalizedNames.add(normalize(sg.name))
          continue
        }

        const status = (sg.playtime_forever ?? 0) > 60 ? 'playing' : 'backlog'
        const { error: libErr } = await supabase
          .from('library')
          .insert({ user_id: userId, game_id: gameId, status })

        if (libErr) {
          if (libErr.code === '23505') {
            result.skipped++
          } else {
            result.errors++
            result.details.push(`${sg.name}: ${libErr.message}`)
          }
        } else {
          result.imported++
          libraryNormalizedNames.add(normalize(sg.name))
        }

        // Petit délai pour ne pas saturer l'API IGDB (4 req/s max)
        await new Promise(r => setTimeout(r, 260))

      } catch (e: any) {
        result.errors++
        result.details.push(`${sg.name}: ${e?.message ?? 'erreur inconnue'}`)
      }
    }

    // Sauvegarde le steam_id sur le profil
    if (steamId) {
      await supabase.from('profiles').update({ steam_id: steamId }).eq('id', userId)
    }

    // XP pour import Steam (1 fois par jour max)
    if (result.imported > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: existingXp } = await supabase
        .from('xp_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('reason', 'steam_import')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .maybeSingle()

      if (!existingXp) {
        const xpAmount = Math.min(result.imported * 10, 500)
        await supabase.from('xp_transactions').insert({ user_id: userId, amount: xpAmount, reason: 'steam_import' })
        const { data: profile } = await supabase.from('profiles').select('xp').eq('id', userId).single()
        if (profile) {
          await supabase.from('profiles').update({ xp: (profile.xp ?? 0) + xpAmount }).eq('id', userId)
        }
      }
    }

    return NextResponse.json(result)

  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Erreur serveur' }, { status: 500 })
  }
}