'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GameList {
  id: string
  title: string
  is_public: boolean
  game_count: number
  already_in: boolean
}

interface Props {
  userId: string
  gameId: string
  gameName: string
  onClose: () => void
}

export default function ListPickerModal({ userId, gameId, gameName, onClose }: Props) {
  const [lists,    setLists]    = useState<GameList[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchLists() {
      const { data: userLists } = await supabase
        .from('lists')
        .select('id, title, is_public, list_games(game_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      setLists((userLists || []).map((l: any) => ({
        id:         l.id,
        title:      l.title,
        is_public:  l.is_public,
        game_count: l.list_games?.length || 0,
        already_in: (l.list_games || []).some((g: any) => g.game_id === gameId),
      })))
      setLoading(false)
    }
    fetchLists()
  }, [gameId, userId])

  // S'assurer que le jeu est dans library
  async function ensureInLibrary() {
    const { data: existing } = await supabase
      .from('library').select('id').eq('user_id', userId).eq('game_id', gameId).maybeSingle()
    if (!existing) {
      await supabase.from('library').insert({ user_id: userId, game_id: gameId, status: 'backlog' })
    }
  }

  async function toggleList(listId: string, alreadyIn: boolean) {
    setSaving(listId)
    if (alreadyIn) {
      await supabase.from('list_games').delete().eq('list_id', listId).eq('game_id', gameId)
    } else {
      await ensureInLibrary()
      await supabase.from('list_games').insert({ list_id: listId, game_id: gameId })
    }
    setLists(prev => prev.map(l => l.id === listId ? { ...l, already_in: !alreadyIn } : l))
    setSaving(null)
  }

  async function createAndAdd() {
    if (!newTitle.trim()) return
    setCreating(true)
    const { data: newList } = await supabase
      .from('lists')
      .insert({ user_id: userId, title: newTitle.trim(), is_public: false })
      .select('id, title, is_public')
      .single()

    if (newList) {
      await ensureInLibrary()
      await supabase.from('list_games').insert({ list_id: newList.id, game_id: gameId })
      setLists(prev => [{ id: newList.id, title: newList.title, is_public: false, game_count: 1, already_in: true }, ...prev])
    }
    setNewTitle('')
    setCreating(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-card dark:bg-card-dark rounded-[var(--radius-xl)] w-full max-w-sm shadow-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-surface dark:border-surface-dark">
          <div>
            <h2 className="font-serif text-lg font-black text-ink dark:text-ink-dark">
              Ajouter à une <em className="italic text-amber">liste</em>
            </h2>
            <p className="text-xs text-ink-subtle mt-0.5 truncate max-w-[200px]">{gameName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center text-ink-muted hover:bg-hover transition-colors text-sm">✕</button>
        </div>

        <div className="px-4 py-3 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="w-5 h-5 border-2 border-amber border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-sm text-center text-ink-muted dark:text-ink-subtle py-6 font-serif italic">
              Tu n'as pas encore de liste
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {lists.map(l => (
                <button key={l.id} onClick={() => toggleList(l.id, l.already_in)} disabled={saving === l.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] w-full text-left transition-all hover:bg-surface dark:hover:bg-surface-dark">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border-2"
                    style={{ background: l.already_in ? 'var(--color-amber)' : 'transparent', borderColor: l.already_in ? 'var(--color-amber)' : 'var(--color-ink-subtle)' }}>
                    {l.already_in && <span className="text-black text-[11px] font-bold leading-none">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink dark:text-ink-dark truncate">{l.title}</p>
                    <p className="text-[10px] text-ink-subtle">{l.game_count} jeux · {l.is_public ? 'Public' : 'Privé'}</p>
                  </div>
                  {saving === l.id && <span className="w-4 h-4 border-2 border-amber border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-surface dark:border-surface-dark">
          <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mb-2">Nouvelle liste</p>
          <div className="flex gap-2">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createAndAdd()}
              placeholder="Nom de la liste…"
              className="flex-1 bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-amber/30" />
            <button onClick={createAndAdd} disabled={creating || !newTitle.trim()}
              className="bg-amber text-black px-3 py-2 rounded-[var(--radius-sm)] text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all flex-shrink-0">
              {creating ? '…' : '＋'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}