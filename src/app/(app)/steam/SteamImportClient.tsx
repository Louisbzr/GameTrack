'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number
  img_icon_url?: string
}

type Step = 'input' | 'fetching' | 'preview' | 'importing' | 'done' | 'error'

interface Result {
  imported: number
  skipped:  number
  errors:   number
  details:  string[]
}

async function searchRawg(name: string): Promise<any | null> {
  try {
    const res  = await fetch(`/api/games/search?q=${encodeURIComponent(name)}`)
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch { return null }
}

export default function SteamImportClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams()
  const autoSyncId   = searchParams.get('autoSync') // steam_id passé depuis le profil

  const [steamId,     setSteamId]     = useState(autoSyncId || '')
  const [step,        setStep]        = useState<Step>(autoSyncId ? 'fetching' : 'input')
  const [games,       setGames]       = useState<SteamGame[]>([])
  const [result,      setResult]      = useState<Result | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [progress,    setProgress]    = useState(0)
  const [current,     setCurrent]     = useState(0)
  const [currentName, setCurrentName] = useState('')

  const router   = useRouter()
  const supabase = createClient()

  // Auto-sync : démarre immédiatement si steam_id fourni en param
  useEffect(() => {
    if (autoSyncId) fetchGames(autoSyncId)
  }, [])

  async function fetchGames(id?: string) {
    const targetId = (id || steamId).trim()
    if (!targetId) return
    setErrorMsg('')
    setStep('fetching')
    try {
      const res  = await fetch(`/api/steam/games?steamId=${encodeURIComponent(targetId)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Impossible de récupérer les jeux Steam.')
        setStep('error')
        return
      }
      setSteamId(targetId)
      setGames(Array.isArray(data.games) ? data.games : [])
      setStep('preview')
    } catch {
      setErrorMsg('Erreur réseau.')
      setStep('error')
    }
  }

  async function runImport(gamesList: SteamGame[]) {
    if (!gamesList.length) return
    setStep('importing')
    setProgress(0)
    setCurrent(0)
    setCurrentName('')

    let imported = 0, skipped = 0, errors = 0
    const details: string[] = []

    for (let i = 0; i < gamesList.length; i++) {
      const sg = gamesList[i]
      setCurrentName(sg.name)
      try {
        // Cover Steam directe — portrait 600x900, parfaite pour les cards
        const steamCoverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${sg.appid}/library_600x900.jpg`

        // 1. Cherche dans notre DB par nom
        const { data: existing } = await supabase
          .from('games')
          .select('id, cover_url')
          .ilike('name', sg.name)
          .maybeSingle()

        let gameId = existing?.id ?? null

        // 2. Enrichit avec RAWG (genres, metacritic) + cover Steam en priorité
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
          // Pas trouvé sur RAWG → insert minimal avec cover Steam quand même
          const { data: ins, error: insErr } = await supabase
            .from('games')
            .insert({ name: sg.name, cover_url: steamCoverUrl, genres: [] })
            .select('id')
            .single()
          if (insErr || !ins) { errors++; details.push(`${sg.name}: ${insErr?.message ?? 'insert échoué'}`); setCurrent(i + 1); setProgress(Math.round(((i + 1) / gamesList.length) * 100)); continue }
          gameId = ins.id
        } else if (gameId && !existing?.cover_url) {
          // Existe mais sans cover → on ajoute la cover Steam
          await supabase.from('games').update({ cover_url: steamCoverUrl }).eq('id', gameId)
        }

        // 4. Déjà en bibliothèque ?
        const { data: inLib } = await supabase.from('library').select('id').eq('user_id', userId).eq('game_id', gameId).maybeSingle()
        if (inLib) { skipped++ }
        else {
          const status = (sg.playtime_forever ?? 0) > 60 ? 'playing' : 'backlog'
          const { error: libErr } = await supabase.from('library').insert({ user_id: userId, game_id: gameId, status })
          if (libErr) {
            if (libErr.code === '23505') skipped++
            else { errors++; details.push(`${sg.name}: ${libErr.message}`) }
          } else { imported++ }
        }
      } catch (e: any) { errors++; details.push(`${sg.name}: ${e?.message ?? 'erreur'}`) }

      setCurrent(i + 1)
      setProgress(Math.round(((i + 1) / gamesList.length) * 100))
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 200))
    }

    await supabase.from('profiles').update({ steam_id: steamId }).eq('id', userId)
    setResult({ imported, skipped, errors, details })
    setCurrentName('')
    setStep('done')
    router.refresh()
  }

  const label = (min: number) => {
    if (!min) return '—'
    const h = Math.floor(min / 60)
    return h > 0 ? `${h}h` : `${min}min`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-1.5">Import</p>
        <h1 className="font-serif text-3xl font-black tracking-tight text-ink dark:text-ink-dark mb-2">
          Importer depuis <em className="italic text-amber">Steam</em>
        </h1>
        <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic">
          {autoSyncId ? 'Synchronisation de ton compte Steam…' : 'Récupère ta bibliothèque + covers via RAWG'}
        </p>
      </div>

      {/* FETCHING (auto-sync) */}
      {step === 'fetching' && (
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-8 shadow-card text-center">
          <div className="w-10 h-10 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-serif text-base font-bold text-ink dark:text-ink-dark">Connexion à Steam…</p>
          <p className="text-sm text-ink-muted dark:text-ink-subtle mt-1 font-mono">{steamId}</p>
        </div>
      )}

      {/* INPUT */}
      {(step === 'input' || step === 'error') && (
        <div className="flex flex-col gap-4">
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
            <h2 className="font-serif text-base font-black mb-1 text-ink dark:text-ink-dark">
              Ton <em className="italic text-amber">Steam ID</em> ou pseudo
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-subtle mb-4">
              Trouve-le sur <code className="font-mono bg-surface dark:bg-surface-dark px-1.5 py-0.5 rounded text-[11px]">steamcommunity.com/id/TON_PSEUDO</code>
            </p>
            <div className="flex gap-2">
              <input type="text" value={steamId} onChange={e => setSteamId(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchGames()}
                placeholder="Pseudo Steam ou 76561198xxxxxxxxx"
                className="flex-1 bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-amber/30"/>
              <button onClick={() => fetchGames()} disabled={!steamId.trim()}
                className="px-5 py-3 rounded-[var(--radius-sm)] text-sm font-semibold bg-ink dark:bg-card-dark text-paper dark:text-ink-dark hover:bg-amber hover:text-black transition-colors disabled:opacity-40">
                Récupérer
              </button>
            </div>
            {step === 'error' && errorMsg && (
              <div className="mt-3 bg-crimson-bg text-crimson text-xs px-3 py-2.5 rounded-[var(--radius-sm)] leading-relaxed">⚠️ {errorMsg}</div>
            )}
          </div>
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
            <h3 className="font-serif text-sm font-black mb-3 text-ink dark:text-ink-dark">Avant d'importer</h3>
            {['Steam → Paramètres → Confidentialité', '"Détails du jeu" → Public', 'Copie ton pseudo ou Steam ID'].map((s, i) => (
              <div key={i} className="flex items-start gap-3 mb-2.5 last:mb-0">
                <span className="w-5 h-5 rounded-full bg-amber text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-ink-muted dark:text-ink-subtle">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && games.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-serif text-base font-black text-ink dark:text-ink-dark">
                  <em className="italic text-amber">{games.length} jeux</em> trouvés
                </h2>
                <p className="text-xs text-ink-muted dark:text-ink-subtle mt-0.5">Covers récupérées automatiquement via RAWG</p>
              </div>
              <button onClick={() => runImport(games)} className="bg-amber text-black px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold hover:opacity-90 transition-opacity">
                Importer tout
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto flex flex-col">
              {games.slice(0, 50).map(g => (
                <div key={g.appid} className="flex items-center gap-3 py-2 border-b border-surface dark:border-surface-dark last:border-0">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface dark:bg-surface-dark flex-shrink-0 flex items-center justify-center text-xs text-ink-subtle">
                    {g.img_icon_url
                      ? <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`} alt={g.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
                      : '🎮'}
                  </div>
                  <p className="text-sm font-medium text-ink dark:text-ink-dark flex-1 truncate">{g.name}</p>
                  <span className="text-[11px] font-mono text-ink-subtle flex-shrink-0">{label(g.playtime_forever)}</span>
                </div>
              ))}
              {games.length > 50 && <p className="text-xs text-center text-ink-subtle py-3">+ {games.length - 50} autres</p>}
            </div>
          </div>
          {!autoSyncId && <button onClick={() => setStep('input')} className="text-sm text-ink-muted hover:text-amber transition-colors text-center">← Changer de Steam ID</button>}
        </div>
      )}

      {/* IMPORTING */}
      {step === 'importing' && (
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-8 shadow-card text-center">
          <div className="text-5xl mb-5">⚙️</div>
          <h2 className="font-serif text-xl font-black mb-2 text-ink dark:text-ink-dark">Import en cours…</h2>
          <p className="text-sm text-ink-muted dark:text-ink-subtle mb-1">Récupération des covers via RAWG</p>
          {currentName && <p className="text-xs text-amber font-mono mb-5 truncate px-4">{currentName}</p>}
          <div className="h-2.5 bg-surface dark:bg-surface-dark rounded-full overflow-hidden mb-3">
            <div className="h-full bg-amber rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs font-mono text-ink-subtle">{progress}% — {current} / {games.length}</p>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && result && (
        <div className="flex flex-col gap-4">
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-8 shadow-card text-center">
            <div className="text-5xl mb-5">🎉</div>
            <h2 className="font-serif text-2xl font-black mb-2 text-ink dark:text-ink-dark">
              {autoSyncId ? 'Sync terminée !' : 'Import terminé !'}
            </h2>
            <p className="text-sm text-ink-muted dark:text-ink-subtle mb-8">Ta bibliothèque a été mise à jour avec les covers</p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-forest-bg rounded-[var(--radius-sm)] p-4">
                <div className="font-serif text-2xl font-black text-forest">{result.imported}</div>
                <div className="text-[10px] font-semibold text-forest/70 uppercase tracking-wider mt-1">Importés</div>
              </div>
              <div className="bg-surface dark:bg-surface-dark rounded-[var(--radius-sm)] p-4">
                <div className="font-serif text-2xl font-black text-ink-muted">{result.skipped}</div>
                <div className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mt-1">Déjà présents</div>
              </div>
              <div className="bg-amber-bg dark:bg-amber-bg-dark rounded-[var(--radius-sm)] p-4">
                <div className="font-serif text-2xl font-black text-amber">{result.errors}</div>
                <div className="text-[10px] font-semibold text-amber/70 uppercase tracking-wider mt-1">Erreurs</div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <a href="/library" className="inline-flex items-center gap-2 bg-ink dark:bg-card-dark text-paper dark:text-ink-dark px-6 py-3 rounded-[var(--radius-sm)] text-sm font-semibold hover:bg-amber hover:text-black transition-colors">
                Voir ma bibliothèque →
              </a>
              {autoSyncId && (
                <a href="/profile" className="inline-flex items-center gap-2 bg-surface dark:bg-surface-dark text-ink-muted dark:text-ink-subtle px-4 py-3 rounded-[var(--radius-sm)] text-sm font-semibold hover:bg-hover transition-colors">
                  ← Profil
                </a>
              )}
            </div>
          </div>
          {result.errors > 0 && result.details.length > 0 && (
            <details className="bg-card dark:bg-card-dark rounded-[var(--radius-md)] p-4 shadow-card">
              <summary className="text-xs font-semibold text-ink-muted cursor-pointer">Voir les {result.errors} erreurs</summary>
              <div className="mt-3 flex flex-col gap-1">
                {result.details.slice(0, 10).map((d, i) => <p key={i} className="text-[11px] text-crimson font-mono">{d}</p>)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}