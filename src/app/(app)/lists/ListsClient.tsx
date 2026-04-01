'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface GameInList {
  id: string
  added_at: string
  games: {
    id: string
    name: string
    cover_url: string | null
    genres: string[] | null
  }
}

interface GameList {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  list_games: GameInList[]
}

interface Props {
  userId: string
  lists?: GameList[] | null
}

export default function ListsClient({ userId, lists: initialLists }: Props) {
  // Défensif : normalise toujours en tableau
  const safeLists: GameList[] = Array.isArray(initialLists) ? initialLists : []

  const [lists,      setLists]      = useState<GameList[]>(safeLists)
  const [showCreate, setShowCreate] = useState(false)
  const [activeList, setActiveList] = useState<GameList | null>(safeLists[0] ?? null)
  const [newTitle,   setNewTitle]   = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [isPublic,   setIsPublic]   = useState(false)
  const [creating,   setCreating]   = useState(false)
  const [showDelete, setShowDelete] = useState<string | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  async function createList() {
    if (!newTitle.trim()) return
    setCreating(true)

    const { data, error } = await supabase
      .from('lists')
      .insert({
        user_id:     userId,
        title:       newTitle.trim(),
        description: newDesc.trim() || null,
        is_public:   isPublic,
      })
      .select('id, title, description, is_public, created_at')
      .single()

    if (!error && data) {
      const newList: GameList = { ...data, list_games: [] }
      setLists(prev => [newList, ...prev])
      setActiveList(newList)
    }

    setNewTitle('')
    setNewDesc('')
    setIsPublic(false)
    setShowCreate(false)
    setCreating(false)
  }

  async function deleteList(id: string) {
    await supabase.from('lists').delete().eq('id', id)
    const updated = lists.filter(l => l.id !== id)
    setLists(updated)
    setActiveList(updated[0] ?? null)
    setShowDelete(null)
  }

  async function removeGame(listId: string, gameId: string) {
    await supabase.from('list_games').delete().eq('list_id', listId).eq('game_id', gameId)
    setLists(prev => prev.map(l =>
      l.id === listId
        ? { ...l, list_games: l.list_games.filter(g => g.games?.id !== gameId) }
        : l
    ))
    if (activeList?.id === listId) {
      setActiveList(prev => prev
        ? { ...prev, list_games: prev.list_games.filter(g => g.games?.id !== gameId) }
        : null
      )
    }
  }

  async function togglePublic(list: GameList) {
    const newVal = !list.is_public
    await supabase.from('lists').update({ is_public: newVal }).eq('id', list.id)
    const updated = (l: GameList) => l.id === list.id ? { ...l, is_public: newVal } : l
    setLists(prev => prev.map(updated))
    setActiveList(prev => prev ? updated(prev) : null)
  }

  return (
    <div className="flex h-full">

      {/* ═══ SIDEBAR listes ═══ */}
      <div className="w-64 flex-shrink-0 border-r border-surface dark:border-surface-dark flex flex-col overflow-hidden bg-side dark:bg-side-dark">
        <div className="p-5 border-b border-surface dark:border-surface-dark flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest mb-0.5">Collections</p>
            <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">
              Mes <em className="italic text-amber">listes</em>
            </h2>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-8 h-8 rounded-[var(--radius-sm)] bg-amber text-black flex items-center justify-center text-lg font-bold hover:scale-105 transition-transform"
          >
            +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {lists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="text-3xl mb-3">📋</div>
              <p className="font-serif text-sm font-bold text-ink dark:text-ink-dark mb-1">Aucune liste</p>
              <p className="text-xs text-ink-muted dark:text-ink-subtle">
                Crée ta première liste pour organiser ta collection
              </p>
            </div>
          )}
          {lists.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveList(l)}
              className="w-full text-left p-3 rounded-[var(--radius-sm)] transition-all"
              style={{
                background: activeList?.id === l.id ? 'var(--color-amber-bg)' : 'transparent',
                border:     activeList?.id === l.id ? '1px solid rgba(200,135,12,0.2)' : '1px solid transparent',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className={`text-sm font-semibold truncate ${activeList?.id === l.id ? 'text-amber' : 'text-ink dark:text-ink-dark'}`}>
                  {l.title}
                </p>
                <span className="text-[10px] font-mono text-ink-subtle flex-shrink-0">
                  {l.list_games?.length ?? 0}
                </span>
              </div>
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{
                  background: l.is_public ? 'var(--color-forest-bg)' : 'var(--color-surface)',
                  color:      l.is_public ? 'var(--color-forest)'    : 'var(--color-ink-subtle)',
                }}
              >
                {l.is_public ? 'Public' : 'Privé'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENU actif ═══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {!activeList ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-6xl mb-5">📋</div>
            <h3 className="font-serif text-2xl font-black mb-2 text-ink dark:text-ink-dark">Crée ta première liste</h3>
            <p className="text-ink-muted dark:text-ink-subtle text-sm max-w-xs mb-6">
              Organise tes jeux en collections thématiques : "RPG à finir", "Recommandations"…
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-amber text-black px-6 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              + Nouvelle liste
            </button>
          </div>
        ) : (
          <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-serif text-2xl lg:text-3xl font-black text-ink dark:text-ink-dark mb-1">
                  {activeList.title}
                </h1>
                {activeList.description && (
                  <p className="text-sm text-ink-muted dark:text-ink-subtle mb-2">{activeList.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-ink-subtle">{activeList.list_games?.length ?? 0} jeux</span>
                  <span className="text-ink-subtle">·</span>
                  <button
                    onClick={() => togglePublic(activeList)}
                    className="text-xs font-semibold transition-colors"
                    style={{ color: activeList.is_public ? 'var(--color-forest)' : 'var(--color-ink-subtle)' }}
                  >
                    {activeList.is_public ? '🌐 Public' : '🔒 Privé'} — changer
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lists/${activeList.id}`)}
                  className="px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold bg-surface dark:bg-surface-dark text-ink-muted hover:bg-hover transition-colors"
                >
                  ↗ Partager
                </button>
                <button
                  onClick={() => setShowDelete(activeList.id)}
                  className="px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-crimson hover:bg-crimson-bg transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {/* Grille de jeux */}
            {!activeList.list_games?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">🎮</div>
                <p className="font-serif text-lg font-bold text-ink dark:text-ink-dark mb-1">Liste vide</p>
                <p className="text-sm text-ink-muted dark:text-ink-subtle max-w-xs">
                  Dans ta bibliothèque, ouvre un jeu et utilise "Ajouter à une liste"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {activeList.list_games.map(item => {
                  if (!item?.games) return null
                  return (
                    <div key={item.games.id} className="group relative">
                      <div
                        className="rounded-[var(--radius-sm)] overflow-hidden shadow-card relative"
                        style={{ aspectRatio: '3/3', background: 'var(--color-card)' }}
                      >
                        {item.games.cover_url ? (
                          <img
                            src={item.games.cover_url}
                            alt={item.games.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🎮</div>
                        )}
                        <button
                          onClick={() => removeGame(activeList.id, item.games.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-crimson"
                        >
                          ✕
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                          <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
                            {item.games.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ MODAL création ═══ */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-card dark:bg-card-dark rounded-[var(--radius-xl)] p-6 w-full max-w-md shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-serif text-xl font-black mb-5 text-ink dark:text-ink-dark">
              Nouvelle <em className="italic text-amber">liste</em>
            </h2>
            <div className="flex flex-col gap-3 mb-5">
              <input
                type="text"
                placeholder="Nom de la liste"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                maxLength={60}
                autoFocus
                className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber/30 placeholder:text-ink-subtle"
              />
              <textarea
                placeholder="Description (optionnel)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-amber/30 placeholder:text-ink-subtle"
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setIsPublic(!isPublic)}
                  className="w-10 h-6 rounded-full transition-all flex items-center px-0.5 flex-shrink-0"
                  style={{ background: isPublic ? 'var(--color-amber)' : 'var(--color-surface)' }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: isPublic ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-ink-dark">Liste publique</p>
                  <p className="text-xs text-ink-muted dark:text-ink-subtle">Visible par tous les joueurs</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-surface dark:bg-surface-dark text-ink-muted hover:bg-hover transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createList}
                disabled={creating || !newTitle.trim()}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-amber text-black hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {creating ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL suppression ═══ */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-card dark:bg-card-dark rounded-[var(--radius-xl)] p-6 w-full max-w-sm shadow-modal">
            <h3 className="font-serif text-xl font-black mb-2 text-ink dark:text-ink-dark">Supprimer la liste ?</h3>
            <p className="text-sm text-ink-muted dark:text-ink-subtle mb-6 leading-relaxed">
              Cette action est irréversible. Les jeux ne seront pas supprimés de ta bibliothèque.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(null)}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-surface dark:bg-surface-dark text-ink-muted hover:bg-hover transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteList(showDelete)}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold bg-crimson text-white hover:opacity-90 transition-opacity"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}