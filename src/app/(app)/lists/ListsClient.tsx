'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Gamepad2 } from 'lucide-react'
import GameCard from '@/components/GameCard'

interface GameInList {
  id: string
  added_at: string
  games: {
    id: string
    name: string
    cover_url: string | null
    genres: string[] | null
    released_at: string | null
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
  library?: any[]        // jeux de la bibliothèque pour "Ma Collection"
  lists?: GameList[] | null
}

const STATUS_TABS = [
  { label: 'Tous',         value: '' },
  { label: 'En cours',     value: 'playing' },
  { label: 'Terminés',     value: 'completed' },
  { label: 'À jouer',      value: 'backlog' },
  { label: 'Backlog',      value: 'backlog2' },
  { label: 'Abandonnés',   value: 'dropped' },
]

export default function ListsClient({ userId, library = [], lists: initialLists }: Props) {
  const safeLists: GameList[] = Array.isArray(initialLists) ? initialLists : []
  const [lists,      setLists]      = useState<GameList[]>(safeLists)
  const [selected,   setSelected]   = useState<string | null>(null)
  const [activeTab,  setActiveTab]  = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle,   setNewTitle]   = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [creating,   setCreating]   = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  // Stats de la bibliothèque par statut
  const countBy = (status: string) => library.filter((l: any) => l.status === status).length
  const tabsWithCount = [
    { label: `Tous (${library.length})`,             value: '' },
    { label: `En cours (${countBy('playing')})`,     value: 'playing' },
    { label: `Terminés (${countBy('completed')})`,   value: 'completed' },
    { label: `À jouer (${countBy('backlog')})`,      value: 'backlog' },
    { label: `Backlog (0)`,                           value: 'backlog2' },
    { label: `Abandonnés (${countBy('dropped')})`,   value: 'dropped' },
  ]

  // Jeux filtrés par tab
  const filteredLibrary = activeTab === '' || activeTab === 'backlog2'
    ? library
    : library.filter((l: any) => l.status === activeTab)

  const activeList = lists.find(l => l.id === selected) ?? null

  async function createList() {
    if (!newTitle.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('lists')
      .insert({ user_id: userId, title: newTitle.trim(), description: newDesc.trim() || null, is_public: true })
      .select('id, title, description, is_public, created_at')
      .single()
    if (!error && data) setLists(p => [{ ...data, list_games: [] }, ...p])
    setNewTitle(''); setNewDesc(''); setShowCreate(false); setCreating(false)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-ink dark:text-ink-dark mb-1">Ma Collection</h1>
            <p className="text-ink-subtle">{library.length} jeux dans votre collection</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Nouvelle liste
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {tabsWithCount.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-primary text-white'
                  : 'text-ink-muted dark:text-ink-subtle hover:text-ink dark:hover:text-ink-dark glass'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Listes cards */}
        {lists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lists.map((list, i) => (
              <button
                key={list.id}
                onClick={() => setSelected(selected === list.id ? null : list.id)}
                className={`glass rounded-lg p-5 text-left transition-all ${
                  selected === list.id ? 'neon-border' : 'hover:bg-surface/50 dark:hover:bg-surface-dark/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-ink dark:text-ink-dark">{list.title}</h3>
                  <span className="text-xs text-ink-subtle flex items-center gap-1 flex-shrink-0">
                    <Gamepad2 className="w-3 h-3" /> {list.list_games.length}
                  </span>
                </div>
                {list.description && (
                  <p className="text-sm text-ink-subtle mb-3">{list.description}</p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-ink-subtle">par moi</span>
                  <span className="text-xs text-ink-subtle">♥ {list.list_games.length * 7 + 10}</span>
                </div>
                {/* Mini covers */}
                <div className="flex -space-x-2">
                  {list.list_games.slice(0, 4).map(lg => (
                    <div key={lg.id} className="w-8 h-12 rounded overflow-hidden ring-2 ring-paper dark:ring-paper-dark bg-surface dark:bg-surface-dark flex-shrink-0">
                      {lg.games?.cover_url
                        ? <img src={lg.games.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs">🎮</div>
                      }
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* List detail (si une liste est sélectionnée) */}
        {activeList && (
          <section>
            <h2 className="text-xl font-bold text-ink dark:text-ink-dark mb-4">{activeList.title}</h2>
            {activeList.list_games.length === 0 ? (
              <div className="glass rounded-lg p-8 text-center">
                <p className="text-ink-subtle">Cette liste est vide.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {activeList.list_games.map((lg, i) => lg.games && (
                  <GameCard key={lg.id} game={lg.games} index={i} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tous les jeux de la collection */}
        <section>
          <h2 className="text-xl font-bold text-ink dark:text-ink-dark mb-4">Tous les jeux</h2>
          {filteredLibrary.length === 0 ? (
            <div className="glass rounded-lg p-12 text-center">
              <p className="text-ink-subtle">Aucun jeu dans cette catégorie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredLibrary.map((item: any, i: number) => item.games && (
                <GameCard
                  key={item.id}
                  game={{
                    id: item.games.id,
                    name: item.games.name,
                    cover_url: item.games.cover_url,
                    released_at: item.games.released_at,
                    rating: item.rating,
                  }}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal création */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setShowCreate(false)}>
          <div className="glass rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-ink dark:text-ink-dark">Nouvelle liste</h2>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre…" autoFocus
              className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-ink-subtle" />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optionnel)…" rows={2}
              className="w-full bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-ink-subtle" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors">Annuler</button>
              <button onClick={createList} disabled={!newTitle.trim() || creating}
                className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                {creating ? '…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}