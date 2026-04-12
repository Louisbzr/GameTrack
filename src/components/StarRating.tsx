'use client'

import { Star } from 'lucide-react'

interface Props {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  step?: number
  onChange?: (rating: number) => void
  onHover?: (rating: number) => void
}

const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' }
const interactiveSizes = { sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-8 h-8' }

export default function StarRating({ rating, maxRating = 5, size = 'md', interactive, step = 0.25, onChange, onHover }: Props) {
  if (!interactive) {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, i) => {
          const filled  = i + 1 <= Math.floor(rating)
          const partial = !filled && i < rating
          const pct     = partial ? ((rating - i) / 1) * 100 : 0
          return (
            <span key={i} className="relative inline-block">
              <Star className={`${sizes[size]} text-muted-foreground/30 text-ink-subtle/30`} />
              {(filled || partial) && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: filled ? '100%' : `${pct}%` }}>
                  <Star className={`${sizes[size]} fill-primary text-primary neon-text`} />
                </span>
              )}
            </span>
          )
        })}
      </div>
    )
  }

  function handleClick(i: number, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const val  = Math.max(step, i + Math.min(Math.ceil(frac / step) * step, 1))
    onChange?.(Math.round(val * 4) / 4)
  }

  function handleMove(i: number, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const val  = Math.max(step, i + Math.min(Math.ceil(frac / step) * step, 1))
    onHover?.(Math.round(val * 4) / 4)
  }

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => onHover?.(0)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const filled  = i + 1 <= Math.floor(rating)
        const partial = !filled && i < rating
        const pct     = partial ? ((rating - i) / 1) * 100 : 0
        return (
          <button key={i} type="button"
            onClick={e => handleClick(i, e)}
            onMouseMove={e => handleMove(i, e)}
            className="cursor-pointer hover:scale-110 transition-transform relative">
            <Star className={`${interactiveSizes[size]} text-ink-subtle/30`} />
            {(filled || partial) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: filled ? '100%' : `${pct}%` }}>
                <Star className={`${interactiveSizes[size]} fill-primary text-primary`} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}