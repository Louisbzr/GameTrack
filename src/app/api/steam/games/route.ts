import { NextResponse } from 'next/server'

const STEAM_API_KEY = process.env.STEAM_API_KEY

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const steamId = searchParams.get('steamId')?.trim()

  if (!steamId) {
    return NextResponse.json({ error: 'steamId manquant' }, { status: 400 })
  }

  if (!STEAM_API_KEY) {
    return NextResponse.json({ error: 'Steam API non configurée (STEAM_API_KEY manquante)' }, { status: 500 })
  }

  try {
    // Résoudre le vanity URL si c'est un pseudo (pas un ID numérique)
    let resolvedSteamId = steamId
    if (!/^\d{17}$/.test(steamId)) {
      const vanityRes = await fetch(
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(steamId)}`
      )
      const vanityData = await vanityRes.json()

      if (vanityData?.response?.success !== 1) {
        return NextResponse.json(
          { error: 'Profil Steam introuvable. Vérifie ton pseudo ou Steam ID.' },
          { status: 404 }
        )
      }
      resolvedSteamId = vanityData.response.steamid
    }

    // Récupérer les jeux possédés
    const gamesRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${resolvedSteamId}&include_appinfo=true&include_played_free_games=true`
    )
    const gamesData = await gamesRes.json()

    if (!gamesData?.response?.games) {
      return NextResponse.json(
        { error: 'Impossible de lire la bibliothèque. Assure-toi que ton profil Steam est public (Paramètres → Confidentialité → Détails du jeu → Public).' },
        { status: 403 }
      )
    }

    // Trier par temps de jeu décroissant et retourner
    const games = gamesData.response.games
      .sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
      .map((g: any) => ({
        appid:            g.appid,
        name:             g.name,
        playtime_forever: g.playtime_forever,  // en minutes
        img_icon_url:     g.img_icon_url,
      }))

    return NextResponse.json({
      steamId: resolvedSteamId,
      total:   games.length,
      games,
    })

  } catch (err) {
    console.error('[Steam API]', err)
    return NextResponse.json({ error: 'Erreur lors de la connexion à Steam' }, { status: 500 })
  }
}