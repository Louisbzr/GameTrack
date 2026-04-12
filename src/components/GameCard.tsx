import Link from 'next/link'
import StarRating from '@/components/StarRating'

interface Props {
  game: {
    id: string
    name: string
    cover_url?: string | null
    released_at?: string | null
    rating?: number | null
  }
  index?: number
}

export default function GameCard({ game, index = 0 }: Props) {
  if (!game || !game.id) return null

  const year   = game.released_at ? new Date(game.released_at).getFullYear() : null
  const rating = game.rating ? Number(game.rating) : null

  return (
    <Link href={`/games/${game.id}`} className="block game-card-hover group">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface dark:bg-surface-dark">
        {game.cover_url
          ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {rating && (
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <div className="flex items-center gap-1.5">
              <StarRating rating={rating} size="sm" />
              <span className="text-xs text-white/70">{Number(game.rating).toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="font-semibold text-sm truncate text-ink dark:text-ink-dark group-hover:text-primary transition-colors">
          {game.name}
        </h3>
        {year && <p className="text-xs text-ink-subtle">{year}</p>}
      </div>
    </Link>
  )
}