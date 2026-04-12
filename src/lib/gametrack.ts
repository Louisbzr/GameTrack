// ─── Types ────────────────────────────────────────────────────────────────────

export interface Game {
  id: string
  name: string
  cover_url: string | null
  genres: string[] | null
  platforms: string[] | null
  released_at: string | null
  metacritic: number | null
  rawg_id: number | null
}

export interface LibraryEntry {
  id: string
  status: 'backlog' | 'playing' | 'completed' | 'dropped'
  rating: number | null
  review: string | null
  created_at: string
  completed_at: string | null
  games: Game
}

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  level: number
  xp: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  playing:   { label: 'En jeu',   bg: 'var(--color-cobalt-bg)',  color: 'var(--color-cobalt)'  },
  completed: { label: 'Platiné',  bg: 'var(--color-forest-bg)',  color: 'var(--color-forest)'  },
  dropped:   { label: 'Dropped',  bg: 'var(--color-crimson-bg)', color: 'var(--color-crimson)' },
  backlog:   { label: 'Backlog',  bg: 'var(--color-amber-bg)',   color: 'var(--color-amber)'   },
}

// ─── Platforms ────────────────────────────────────────────────────────────────
// Les clés couvrent les deux sources : RAWG et IGDB.
// RAWG utilise des noms différents d'IGDB sur plusieurs points (PC, Xbox Series, Sega…)
// → toutes les variantes connues sont listées pour éviter les trous dans les filtres.

export const PLATFORM_SHORT: Record<string, string> = {
  // ── PC / Mac / Linux ───────────────────────────────────────────────────────
  'PC':                                       'PC',   // RAWG
  'PC (Microsoft Windows)':                   'PC',   // IGDB
  'Mac':                                      'Mac',
  'macOS':                                    'Mac',  // RAWG
  'Linux':                                    'Linux',
  'Web browser':                              'Web',  // IGDB
  'Web':                                      'Web',  // RAWG
  'DOS':                                      'DOS',

  // ── PlayStation ────────────────────────────────────────────────────────────
  'PlayStation':                              'PS1',
  'PlayStation 2':                            'PS2',
  'PlayStation 3':                            'PS3',
  'PlayStation 4':                            'PS4',
  'PlayStation 5':                            'PS5',
  'PS Vita':                                  'VITA', // RAWG
  'PlayStation Vita':                         'VITA', // IGDB
  'PSP':                                      'PSP',  // RAWG
  'PlayStation Portable':                     'PSP',  // IGDB
  'PlayStation Network (PS3)':                'PSN',
  'PlayStation Network (PS4)':                'PSN',
  'PlayStation Network (Vita)':               'PSN',

  // ── Xbox ───────────────────────────────────────────────────────────────────
  'Xbox':                                     'XBOX',
  'Xbox 360':                                 'X360',
  'Xbox One':                                 'XBO',
  'Xbox Series S/X':                          'XSX', // RAWG
  'Xbox Series X|S':                          'XSX', // IGDB
  'Xbox Series X':                            'XSX',
  'Xbox Series S':                            'XSS',
  'Xbox Live Arcade':                         'XBLA',

  // ── Nintendo — consoles ────────────────────────────────────────────────────
  'NES':                                      'NES',  // RAWG (abrégé)
  'Nintendo Entertainment System':            'NES',  // IGDB
  'SNES':                                     'SNES', // RAWG (abrégé)
  'Super Nintendo Entertainment System':      'SNES', // IGDB
  'Nintendo 64':                              'N64',
  'GameCube':                                 'GCN',  // RAWG
  'Nintendo GameCube':                        'GCN',  // IGDB
  'Wii':                                      'Wii',
  'Wii U':                                    'WiiU',
  'Nintendo Switch':                          'NSW',
  'Nintendo Switch 2':                        'NSW2',
  'Virtual Boy':                              'VB',

  // ── Nintendo — portables ───────────────────────────────────────────────────
  'Game Boy':                                 'GB',
  'Game Boy Color':                           'GBC',
  'Game Boy Advance':                         'GBA',
  'Nintendo DS':                              'DS',
  'Nintendo DSi':                             'DSi',
  'Nintendo 3DS':                             '3DS',
  'New Nintendo 3DS':                         '3DS',

  // ── Sega ───────────────────────────────────────────────────────────────────
  'Sega Master System':                       'SMS',  // RAWG
  'Sega Master System/Mark III':              'SMS',  // IGDB
  'Sega Genesis':                             'MD',   // RAWG
  'Sega Mega Drive/Genesis':                  'MD',   // IGDB
  'Sega Saturn':                              'SAT',
  'Dreamcast':                                'DC',   // RAWG
  'Sega Dreamcast':                           'DC',   // IGDB
  'Game Gear':                                'GG',   // RAWG
  'Sega Game Gear':                           'GG',   // IGDB
  'Sega 32X':                                 '32X',
  'Sega CD':                                  'SCD',

  // ── Atari ──────────────────────────────────────────────────────────────────
  'Atari 2600':                               'A26',
  'Atari 7800':                               'A78',
  'Atari Jaguar':                             'JAG',
  'Atari Lynx':                               'LYNX',
  'Atari ST':                                 'AST',  // RAWG
  'Atari ST/STE':                             'AST',  // IGDB

  // ── SNK / NEC / rétro ─────────────────────────────────────────────────────
  'Neo Geo':                                  'NEO',  // RAWG
  'Neo Geo AES':                              'NEO',  // IGDB
  'Neo Geo MVS':                              'NEO',
  'Neo Geo CD':                               'NEOCD',
  'Neo Geo Pocket':                           'NGP',
  'Neo Geo Pocket Color':                     'NGPC',
  'TurboGrafx-16':                            'PCE',  // RAWG
  'TurboGrafx-16/PC Engine':                  'PCE',  // IGDB
  'TurboGrafx-CD/PC Engine CD':               'PCECD',
  'WonderSwan':                               'WS',
  'WonderSwan Color':                         'WSC',
  'Commodore / Amiga':                        'AMI',  // RAWG
  'Commodore C64/128/MAX':                    'C64',  // IGDB
  'Amiga':                                    'AMI',
  'MSX':                                      'MSX',
  'MSX2':                                     'MSX2',
  'ZX Spectrum':                              'ZX',
  'Amstrad CPC':                              'CPC',

  // ── Mobile ─────────────────────────────────────────────────────────────────
  'Android':                                  'AND',
  'iOS':                                      'iOS',
  'Windows Phone':                            'WP',

  // ── Divers ─────────────────────────────────────────────────────────────────
  'Arcade':                                   'ARC',
  'Oculus VR':                                'VR',
  'SteamVR':                                  'VR',
  'Meta Quest 2':                             'VR',
  'Meta Quest 3':                             'VR',
  'Google Stadia':                            'STD',
  'Amazon Luna':                              'LUNA',
}

export const RATING_LABELS = ['', 'Nul', 'Bof', 'Bien', 'Super', "Chef-d'œuvre"]

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'var(--color-cobalt-bg)',  text: 'var(--color-cobalt)'  },
  { bg: 'var(--color-forest-bg)',  text: 'var(--color-forest)'  },
  { bg: 'var(--color-crimson-bg)', text: 'var(--color-crimson)' },
  { bg: 'var(--color-amber-bg)',   text: 'var(--color-amber)'   },
  { bg: 'var(--color-grape-bg)',   text: 'var(--color-grape)'   },
]

function hashStr(str: string): number {
  let h = 0
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h)
  return Math.abs(h)
}

export function getAvatar(str: string) {
  return AVATAR_PALETTE[hashStr(str) % AVATAR_PALETTE.length]
}

// ─── Time ─────────────────────────────────────────────────────────────────────

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "À l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ─── XP ───────────────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  add_game:      10,
  write_review:  50,
  rate_game:     25,
  complete_game: 30,
} as const

export type XpReason = keyof typeof XP_REWARDS

export async function grantDailyXp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  reason: XpReason,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('xp_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', reason)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .maybeSingle()

  if (existing) return 0

  const amount = XP_REWARDS[reason]

  await supabase.from('xp_transactions').insert({ user_id: userId, amount, reason })

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single()

  if (profile) {
    await supabase
      .from('profiles')
      .update({ xp: (profile.xp ?? 0) + amount })
      .eq('id', userId)
  }

  return amount
}