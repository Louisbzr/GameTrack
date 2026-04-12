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

async function searchRawg(name: string): Promise<any | null> {
  try {
    const url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(name)}&page_size=1`
    const res  = await fetch(url, { next: { revalidate: 86400 } }) // cache 24h
    const data = await res.json()
    const game = data?.results?.[0]
    if (!game) return null
    return {
      rawgId:     game.id,
      name:       game.name,
      released:   game.released,
      metacritic: game.metacritic,
      genres:     game.genres?.map((g: any) => g.name) ?? [],
    }
  } catch {
    return null
  }
}

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

    // Vérifie que l'utilisateur est bien connecté et correspond à userId
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const result: ImportResult = { imported: 0, skipped: 0, errors: 0, details: [] }

    for (const sg of games) {
      try {
        const steamCoverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${sg.appid}/library_600x900.jpg`

        // 1. Cherche le jeu en DB par nom
        const { data: existing } = await supabase
          .from('games')
          .select('id, cover_url')
          .ilike('name', sg.name)
          .maybeSingle()

        let gameId: string | null = existing?.id ?? null

        // 2. Enrichissement RAWG
        const rawg = await searchRawg(sg.name)

        if (rawg) {
          const { data: upserted } = await supabase
            .from('games')
            .upsert({
              rawg_id:     rawg.rawgId,
              name:        rawg.name || sg.name,
              cover_url:   steamCoverUrl,
              genres:      rawg.genres ?? [],
              released_at: rawg.released,
              metacritic:  rawg.metacritic,
            }, { onConflict: 'rawg_id', ignoreDuplicates: false })
            .select('id')
            .single()

          if (upserted?.id) gameId = upserted.id
        } else if (!gameId) {
          // Pas trouvé sur RAWG → insert minimal avec cover Steam
          const { data: ins, error: insErr } = await supabase
            .from('games')
            .insert({ name: sg.name, cover_url: steamCoverUrl, genres: [] })
            .select('id')
            .single()

          if (insErr || !ins) {
            result.errors++
            result.details.push(`${sg.name}: ${insErr?.message ?? 'insert échoué'}`)
            continue
          }
          gameId = ins.id
        } else if (gameId && !existing?.cover_url) {
          await supabase.from('games').update({ cover_url: steamCoverUrl }).eq('id', gameId)
        }

        if (!gameId) {
          result.errors++
          result.details.push(`${sg.name}: impossible de résoudre le game_id`)
          continue
        }

        // 3. Déjà en bibliothèque ?
        const { data: inLib } = await supabase
          .from('library')
          .select('id')
          .eq('user_id', userId)
          .eq('game_id', gameId)
          .maybeSingle()

        if (inLib) {
          result.skipped++
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
        }
      } catch (e: any) {
        result.errors++
        result.details.push(`${sg.name}: ${e?.message ?? 'erreur inconnue'}`)
      }
    }

    // Sauvegarde le steam_id sur le profil
    if (steamId) {
      await supabase.from('profiles').update({ steam_id: steamId }).eq('id', userId)
    }

    // XP pour import Steam (si au moins 1 jeu importé)
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
        const xpAmount = Math.min(result.imported * 5, 200) // 5 XP par jeu, max 200
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