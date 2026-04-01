import { NextResponse } from 'next/server'

const STEAM_API_KEY = process.env.STEAM_API_KEY

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const steamId = searchParams.get('steamId')?.trim()

  if (!steamId) {
    return NextResponse.json({ error: 'steamId manquant' }, { status: 400 })
  }

  if (!STEAM_API_KEY) {
    return NextResponse.json(
      { error: 'STEAM_API_KEY non configurée dans .env.local' },
      { status: 500 }
    )
  }

  try {
    // Résoudre vanity URL si c'est un pseudo (pas un ID 17 chiffres)
    let resolvedId = steamId
    if (!/^\d{17}$/.test(steamId)) {
      const vanityRes  = await fetch(
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(steamId)}`
      )
      const vanityData = await vanityRes.json()
      if (vanityData?.response?.success !== 1) {
        return NextResponse.json(
          { error: 'Profil Steam introuvable. Vérifie ton pseudo ou Steam ID.' },
          { status: 404 }
        )
      }
      resolvedId = vanityData.response.steamid
    }

    // Récupérer les jeux possédés
    const gamesRes  = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${resolvedId}&include_appinfo=true&include_played_free_games=true`
    )
    const gamesData = await gamesRes.json()

    if (!gamesData?.response?.games) {
      return NextResponse.json(
        { error: 'Bibliothèque inaccessible. Va dans Steam → Paramètres → Confidentialité → Détails du jeu → Public.' },
        { status: 403 }
      )
    }

    const games = gamesData.response.games
      .sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
      .map((g: any) => ({
        appid:            g.appid,
        name:             g.name,
        playtime_forever: g.playtime_forever,
        img_icon_url:     g.img_icon_url,
      }))

    return NextResponse.json({ steamId: resolvedId, total: games.length, games })

  } catch (err) {
    console.error('[Steam API]', err)
    return NextResponse.json({ error: 'Erreur de connexion à Steam' }, { status: 500 })
  }
}