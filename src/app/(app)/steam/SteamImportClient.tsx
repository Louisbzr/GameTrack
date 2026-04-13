'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number
  img_icon_url?: string
}

interface ImportResult {
  imported: number
  skipped:  number
  errors:   number
  details:  string[]
}

type Step = 'input' | 'fetching' | 'preview' | 'importing' | 'done' | 'error'

export default function SteamImportClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams()
  const autoSyncId   = searchParams.get('autoSync')

  const [steamId,  setSteamId]  = useState(autoSyncId || '')
  const [step,     setStep]     = useState<Step>(autoSyncId ? 'fetching' : 'input')
  const [games,    setGames]    = useState<SteamGame[]>([])
  const [result,   setResult]   = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const router = useRouter()

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

    try {
      const res  = await fetch('/api/steam/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, games: gamesList, steamId }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Erreur lors de l\'import.')
        setStep('error')
        return
      }

      setResult(data)
      setStep('done')
      router.refresh()
    } catch {
      setErrorMsg('Erreur réseau pendant l\'import.')
      setStep('error')
    }
  }

  const label = (min: number) => {
    if (!min) return '—'
    const h = Math.floor(min / 60)
    return h > 0 ? `${h}h` : `${min}min`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-28 pb-16">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-1.5">Import</p>
        <h1 className="font-serif text-3xl font-black tracking-tight text-ink dark:text-ink-dark mb-2">
          Importer depuis <em className="italic text-amber">Steam</em>
        </h1>
        <p className="text-sm text-ink-muted dark:text-ink-subtle font-serif italic">
          {autoSyncId ? 'Synchronisation de ton compte Steam…' : 'Récupère ta bibliothèque + covers via IGDB'}
        </p>
      </div>

      {/* FETCHING */}
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
                <p className="text-xs text-ink-muted dark:text-ink-subtle mt-0.5">Import + enrichissement IGDB côté serveur</p>
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
          {!autoSyncId && (
            <button onClick={() => setStep('input')} className="text-sm text-ink-muted hover:text-amber transition-colors text-center">← Changer de Steam ID</button>
          )}
        </div>
      )}

      {/* IMPORTING */}
      {step === 'importing' && (
        <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-8 shadow-card text-center">
          <div className="w-12 h-12 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <h2 className="font-serif text-xl font-black mb-2 text-ink dark:text-ink-dark">Import en cours…</h2>
          <p className="text-sm text-ink-muted dark:text-ink-subtle mb-1">
            Enrichissement RAWG et import de {games.length} jeux
          </p>
          <p className="text-xs text-ink-subtle font-serif italic mt-3">
            Cela peut prendre quelques secondes, ne ferme pas la page.
          </p>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && result && (
        <div className="flex flex-col gap-4">
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-lg)] p-8 shadow-card text-center">
            {result.imported === 0 && result.skipped > 0 ? (
              <>
                <div className="text-5xl mb-5">✅</div>
                <h2 className="font-serif text-2xl font-black mb-2 text-ink dark:text-ink-dark">
                  Bibliothèque déjà à jour !
                </h2>
                <p className="text-sm text-ink-muted dark:text-ink-subtle mb-8">
                  Tous tes jeux Steam ({result.skipped}) sont déjà dans ta bibliothèque GameTrack.
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-5">🎉</div>
                <h2 className="font-serif text-2xl font-black mb-2 text-ink dark:text-ink-dark">
                  {autoSyncId ? 'Sync terminée !' : 'Import terminé !'}
                </h2>
                <p className="text-sm text-ink-muted dark:text-ink-subtle mb-8">Ta bibliothèque a été mise à jour</p>
              </>
            )}
            {(result.imported > 0 || result.errors > 0) && (
              <>
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
                {result.imported > 0 && (
                  <div className="bg-amber-bg dark:bg-amber-bg-dark rounded-[var(--radius-sm)] p-3 mb-5 inline-flex items-center gap-2">
                    <span className="text-amber font-bold text-sm">+{Math.min(result.imported * 10, 500)} XP</span>
                    <span className="text-[11px] text-amber/70">pour l'import Steam</span>
                  </div>
                )}
              </>
            )}
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