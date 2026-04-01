'use client'

import Link from 'next/link'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const ListPickerModal = dynamic(() => import('./ListPickerModal'), { ssr: false })

const STATUS_CONFIG = {
  completed: { label: 'Terminé',  bg: 'bg-forest',  text: 'text-white' },
  playing:   { label: 'En cours', bg: 'bg-amber',    text: 'text-black' },
  backlog:   { label: 'Backlog',  bg: 'bg-black/20', text: 'text-white' },
  dropped:   { label: 'Abandon',  bg: 'bg-crimson',  text: 'text-white' },
} as const

const PLACEHOLDER_COLORS = [
  '#ede8dc','#dceadf','#dde4ed','#ece0ed','#deeae8','#edeadd',
]
const EMOJIS = ['🎮','⚔️','🌿','🚀','🐉','🌌','🎪','🌊','🏹','🌱','🎯','🏕']

function hashStr(str: string) {
  let h = 0
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h)
  return Math.abs(h)
}

const PLATFORM_SHORT: Record<string, string> = {
  'PlayStation 5': 'PS5','PlayStation 4': 'PS4','PlayStation 3': 'PS3',
  'Xbox One': 'XBO','Xbox Series S/X': 'XSX','Xbox 360': 'X360',
  'Nintendo Switch': 'NSW','PC': 'PC','iOS': 'iOS','Android': 'AND',
  'Wii': 'Wii','Wii U': 'WiiU','Nintendo DS': 'NDS','Nintendo 3DS': '3DS',
}
function shortPlatform(p: string) { return PLATFORM_SHORT[p] || p.slice(0, 3) }

interface Props {
  id: string
  userId?: string
  name: string
  genre?: string
  status: keyof typeof STATUS_CONFIG
  rating?: number | null
  coverUrl?: string | null
  review?: string | null
  platforms?: string[] | null
  releasedAt?: string | null
  gameId?: string
}

export default function GameCard({ id, userId, name, genre, status, rating, coverUrl, review, platforms, releasedAt, gameId }: Props) {
  const [showListPicker, setShowListPicker] = useState(false)

  const cfg          = STATUS_CONFIG[status] || STATUS_CONFIG.backlog
  const year         = releasedAt ? new Date(releasedAt).getFullYear() : null
  const topPlat      = platforms?.slice(0, 3) || []
  const placeholderBg = PLACEHOLDER_COLORS[hashStr(name) % PLACEHOLDER_COLORS.length]
  const emoji         = EMOJIS[hashStr(name) % EMOJIS.length]

  return (
    <>
      <Link href={`/library/${id}`} className="block">
        <div
          className="group relative rounded-[var(--radius-md)] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-hover"
          style={{ aspectRatio: '3/3', background: placeholderBg }}
        >
          {/* Cover */}
          {coverUrl ? (
            <img
              src={coverUrl} alt={name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl">{emoji}</span>
              <span className="text-[10px] font-mono text-ink-subtle text-center px-3 leading-tight">{name}</span>
            </div>
          )}

          {/* Gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 50%, transparent 100%)' }}
          />

          {/* Status */}
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 backdrop-blur-sm ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>

          {/* Rating */}
          {rating && (
            <span
              className="absolute top-2 right-2 text-[11px] font-bold font-mono z-10 px-1.5 py-0.5 rounded-md text-amber"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            >
              ★ {rating}
            </span>
          )}

          {/* Info bar */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
            <p className="font-serif text-[12px] font-bold text-white leading-tight line-clamp-2 mb-1">{name}</p>
            <div className="flex items-center justify-between gap-1">
              {genre && <span className="text-[9px] font-semibold text-white/50 uppercase tracking-wider truncate">{genre}</span>}
              {year  && <span className="text-[9px] font-semibold text-white/40 flex-shrink-0">{year}</span>}
            </div>
            {topPlat.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {topPlat.map(p => (
                  <span key={p} className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)' }}>
                    {shortPlatform(p)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Hover overlay */}
          <div className="game-card-overlay absolute inset-0 z-20"
            style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(2px)' }}
          />

          {/* Hover actions */}
          <div className="game-card-actions absolute bottom-0 left-0 right-0 p-3 z-30 flex flex-col gap-2">
            {/* Stars */}
            <div className="flex justify-center gap-1.5">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="text-lg leading-none"
                  style={{ color: rating && Math.round(rating/2) >= i ? 'var(--color-amber)' : 'rgba(255,255,255,0.25)' }}>
                  ★
                </span>
              ))}
            </div>
            {/* Buttons */}
            <div className="flex gap-1.5">
              <span className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg"
                style={{ background: 'var(--color-amber)', color: '#000' }}>
                {status === 'completed' ? '✓ Terminé' : status === 'playing' ? '▶ En cours' : '+ Backlog'}
              </span>
              {userId && gameId && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setShowListPicker(true) }}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)' }}
                  title="Ajouter à une liste"
                >
                  ≡
                </button>
              )}
              <span className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                ✎
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* List picker modal */}
      {showListPicker && userId && gameId && (
        <ListPickerModal
          userId={userId}
          gameId={gameId}
          gameName={name}
          onClose={() => setShowListPicker(false)}
        />
      )}
    </>
  )
}