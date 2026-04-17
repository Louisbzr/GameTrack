'use client'

import { useState, useMemo } from 'react'
import { Heart, Search, X } from 'lucide-react'
import ReviewCard from '@/components/ReviewCard'

export default function TopReviewsClient({ reviews, userId }: { reviews: any[]; userId: string }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return reviews
    const q = search.toLowerCase()
    return reviews.filter(r =>
      r.review?.toLowerCase().includes(q) ||
      r.profiles?.username?.toLowerCase().includes(q) ||
      r.games?.name?.toLowerCase().includes(q)
    )
  }, [reviews, search])

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Heart className="w-6 h-6 text-primary neon-text" />
            <h1 className="text-3xl font-bold text-foreground">Avis les plus aimés</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-9">Top {reviews.length} avis de la communauté</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par jeu, joueur ou contenu..."
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {search && (
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
        )}

        {/* Reviews */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-foreground">Aucun avis trouvé</p>
            {search && <p className="text-sm mt-1">Essaie une autre recherche.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item, i) => (
              <div key={item.id} className="flex gap-4 items-start">
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  <span className={`text-lg font-extrabold ${i < 3 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                    {i + 1}
                  </span>
                </div>
                {/* Card */}
                <div className="flex-1">
                  <ReviewCard
                    review={{
                      id:           item.id,
                      user_id:      item.user_id,
                      username:     item.profiles?.username ?? 'Joueur',
                      avatar_color: item.profiles?.avatar_color,
                      avatar_url:   item.profiles?.avatar_url ?? undefined,
                      rating:       item.rating,
                      review:       item.review,
                      updated_at:   item.updated_at,
                      likes:        item.likes ?? 0,
                      likedByMe:    item.likedByMe ?? false,
                    }}
                    gameTitle={item.games?.name}
                    gameId={item.games?.id}
                    currentUserId={userId}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}