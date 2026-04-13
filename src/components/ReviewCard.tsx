'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThumbsUp, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ReportModal from '@/components/ReportModal'

interface Props {
  review: {
    id: string
    user_id?: string
    username: string
    avatar_color?: string
    avatar_url?: string
    rating: number
    review: string
    updated_at: string
    likes?: number
    likedByMe?: boolean
  }
  gameTitle?: string
  gameId?: string
  currentUserId?: string
}

const AVATAR_COLORS: Record<string, string> = {
  forest: '#22c55e', ocean: '#3b82f6', fire: '#f97316',
  violet: '#a855f7', rose: '#ec4899', gold: '#f59e0b',
  ice: '#06b6d4',    slate: '#64748b',
}

function StarDisplay({ rating }: { rating: number }) {
  const full = Math.floor(Number(rating))
  const half = Number(rating) - full >= 0.5
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className="text-primary text-base">★</span>
        if (i === full && half) return (
          <span key={i} className="relative inline-block text-base">
            <span className="text-muted-foreground/30">★</span>
            <span className="absolute inset-0 overflow-hidden w-[50%]"><span className="text-primary">★</span></span>
          </span>
        )
        return <span key={i} className="text-muted-foreground/30 text-base">★</span>
      })}
    </div>
  )
}

export default function ReviewCard({ review, gameTitle, gameId, currentUserId }: Props) {
  const supabase = createClient()
  const date     = review.updated_at ? review.updated_at.slice(0, 10) : ''
  const color    = AVATAR_COLORS[review.avatar_color ?? 'forest'] ?? '#22c55e'
  const initials = (review.username ?? '?').slice(0, 2).toUpperCase()

  const [likes,   setLikes]   = useState(review.likes ?? 0)
  const [liked,   setLiked]   = useState(review.likedByMe ?? false)
  const [loading,    setLoading]    = useState(false)
  const [reporting,  setReporting]  = useState(false)

  async function handleLike() {
    if (!currentUserId || loading) return
    setLoading(true)
    if (liked) {
      await supabase.from('review_likes').delete()
        .eq('library_id', review.id).eq('user_id', currentUserId)
      setLikes(l => l - 1)
      setLiked(false)
    } else {
      await supabase.from('review_likes').insert({ library_id: review.id, user_id: currentUserId })
      setLikes(l => l + 1)
      setLiked(true)
    }
    setLoading(false)
  }

  return (
    <div className="glass rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-border">
            {review.avatar_url
              ? <img src={review.avatar_url} alt={review.username} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center font-semibold text-sm text-white"
                  style={{ backgroundColor: color }}>{initials}</div>
            }
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{review.username}</p>
            {gameTitle && gameId && (
              <Link href={`/games/${gameId}`} className="text-xs text-primary hover:underline">{gameTitle}</Link>
            )}
            {gameTitle && !gameId && <p className="text-xs text-primary">{gameTitle}</p>}
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </div>
        <StarDisplay rating={review.rating} />
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{review.review}</p>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleLike}
          disabled={!currentUserId || loading}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            liked ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          } disabled:cursor-default`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-primary' : ''}`} />
          {likes}
        </button>
        {currentUserId && currentUserId !== review.user_id && (
          <button onClick={() => setReporting(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-red-400 transition-colors">
            <Flag className="w-3 h-3" />
          </button>
        )}
      </div>

      {reporting && currentUserId && (
        <ReportModal
          targetType="review"
          targetId={review.id}
          reporterId={currentUserId}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  )
}