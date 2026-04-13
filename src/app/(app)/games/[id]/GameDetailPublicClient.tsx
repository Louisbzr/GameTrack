'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Calendar, Building2, Monitor, Tag, Send, X,
  Users, MessageSquare, Info, BarChart3, Gamepad2,
  ExternalLink, Globe, TrendingUp, Heart, Share2, Bookmark, Play,
  ChevronDown, Check, PlusCircle, ChevronRight, ThumbsUp, Pencil, Trash2, Trophy, Clock, List, Image, ImagePlus, FileImage, BookOpen, Smile, Meh, Frown
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import StarRating from '@/components/StarRating'
import ReviewCard from '@/components/ReviewCard'
import ListPickerModal from '@/components/library/ListPickerModal'
import { useSettings } from '@/components/SettingsProvider'

interface Props {
  game: any
  reviews: any[]
  myEntry: any | null
  similarGames: any[]
  userId: string
}

const STATUS_OPTIONS = [
  { value: 'playing',   label: 'En cours',  color: '#3b82f6', icon: Gamepad2 },
  { value: 'completed', label: 'Terminé',   color: '#22c55e', icon: Trophy   },
  { value: 'backlog',   label: 'À jouer',   color: '#f59e0b', icon: Bookmark },
  { value: 'dropped',   label: 'Abandonné', color: '#ef4444', icon: X        },
]

const TABS = [
  { id: 'overview',  label: "Vue d'ensemble", icon: Info        },
  { id: 'media',     label: 'Médias',         icon: Image       },
  { id: 'community', label: 'Communauté',     icon: Users       },
  { id: 'stats',     label: 'Statistiques',   icon: BarChart3   },
  { id: 'journal',   label: 'Journal',        icon: Bookmark    },
]

function formatReleaseDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function GameDetailPublicClient({ game, reviews, myEntry, similarGames, userId }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const { settings } = useSettings()

  const [userRating,     setUserRating]     = useState<number>(myEntry?.rating ? Number(myEntry.rating) : 0)
  const [hoverRating,    setHoverRating]    = useState(0)
  const [userStatus,     setUserStatus]     = useState<string>(myEntry?.status ?? '')
  const [description,    setDescription]    = useState<string>(game.description ?? '')
  const [developer,      setDeveloper]      = useState<string>(game.developer ?? '')
  const [publisher,      setPublisher]      = useState<string>('')
  const [releaseDate,    setReleaseDate]    = useState<string | null>(game.released_at ?? null)
  const [websites,       setWebsites]       = useState<{ official: string|null; steam: string|null; wikipedia: string|null }>({ official: null, steam: null, wikipedia: null })
  const [screenshots,    setScreenshots]    = useState<{ url: string; thumb: string }[]>([])
  const [artworks,       setArtworks]       = useState<{ url: string; thumb: string }[]>([])
  const [videos,         setVideos]         = useState<{ title: string; videoId: string; thumbnail: string; url: string }[]>([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [reviewText,     setReviewText]     = useState(myEntry?.review || '')
  const [allReviews,     setAllReviews]     = useState(reviews)
  const [platforms,      setPlatforms]      = useState<string[]>(game.platforms?.slice(0, 8) ?? [])
  const [igdbGenres,     setIgdbGenres]     = useState<string[]>(game.genres ?? [])
  const [igdbSimilar,    setIgdbSimilar]    = useState<any[]>(similarGames)
  const [inLibrary,      setInLibrary]      = useState(!!myEntry)
  const [isFavorite,     setIsFavorite]     = useState<boolean>(myEntry?.is_favorite ?? false)
  const [carouselOffset, setCarouselOffset] = useState(0)
  const [activeTab,      setActiveTab]      = useState('overview')
  const [lightbox,       setLightbox]       = useState<string | null>(null)

  // Discussions
  const [discussions,        setDiscussions]        = useState<any[]>([])
  const [discussionsLoaded,  setDiscussionsLoaded]  = useState(false)
  const [showNewDiscussion,  setShowNewDiscussion]  = useState(false)
  const [newDiscTitle,       setNewDiscTitle]       = useState('')
  const [newDiscBody,        setNewDiscBody]        = useState('')
  const [postingDisc,        setPostingDisc]        = useState(false)
  const [openDiscussion,     setOpenDiscussion]     = useState<any | null>(null)
  const [discComments,       setDiscComments]       = useState<any[]>([])
  const [newComment,         setNewComment]         = useState('')
  const [postingComment,     setPostingComment]     = useState(false)
  const [discImages,         setDiscImages]         = useState<string[]>([])   // URLs for new discussion
  const [commentImage,       setCommentImage]       = useState<string | null>(null) // URL for new comment
  const [uploadingImg,       setUploadingImg]       = useState(false)
  const discImgRef     = useRef<HTMLInputElement>(null)
  const commentImgRef  = useRef<HTMLInputElement>(null)
  const journalImgRef  = useRef<HTMLInputElement>(null)

  // Journal
  const [journalEntries,  setJournalEntries]  = useState<any[]>([])
  const [journalLoaded,   setJournalLoaded]   = useState(false)
  const [showJournalForm, setShowJournalForm] = useState(false)
  const [jMood,           setJMood]           = useState('bien')
  const [jHours,          setJHours]          = useState('')
  const [jProgress,       setJProgress]       = useState('')
  const [jNotes,          setJNotes]          = useState('')
  const [jImages,         setJImages]         = useState<string[]>([])
  const [savingJournal,   setSavingJournal]   = useState(false)
  const [uploadingJImg,   setUploadingJImg]   = useState(false)

  useEffect(() => {
    const params = new URLSearchParams({ name: game.name })
    fetch(`/api/games/details?${params}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.description)          setDescription(data.description)
        if (data.developer)            setDeveloper(data.developer)
        if (data.publisher)            setPublisher(data.publisher)
        if (data.releaseDate)          setReleaseDate(data.releaseDate)
        if (data.platforms?.length)    setPlatforms(data.platforms)
        if (data.genres?.length)       setIgdbGenres(data.genres)
        if (data.similarGames?.length) setIgdbSimilar(data.similarGames)
        if (data.websites)             setWebsites(data.websites)
        if (data.screenshots?.length)  setScreenshots(data.screenshots)
        if (data.artworks?.length)     setArtworks(data.artworks)
        if (data.videos?.length)       setVideos(data.videos)
      })
      .catch(() => {})
  }, [game.id])

  useEffect(() => {
    if (activeTab !== 'community' || discussionsLoaded) return
    supabase.from('discussions')
      .select('id, title, body, created_at, user_id, profiles(username, avatar_url, avatar_color)')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setDiscussions(data ?? []); setDiscussionsLoaded(true) })
  }, [activeTab, discussionsLoaded])

  useEffect(() => {
    if (activeTab !== 'journal' || journalLoaded) return
    supabase.from('game_journal')
      .select('*')
      .eq('game_id', game.id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setJournalEntries(data ?? []); setJournalLoaded(true) })
  }, [activeTab, journalLoaded])

  useEffect(() => {
    if (!openDiscussion) return
    supabase.from('discussion_comments')
      .select('id, body, created_at, user_id, profiles(username, avatar_url, avatar_color)')
      .eq('discussion_id', openDiscussion.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setDiscComments(data ?? []))
  }, [openDiscussion?.id])

  useEffect(() => {
    if (inLibrary) return
    supabase.from('library').select('id').eq('user_id', userId).eq('game_id', game.id).maybeSingle()
      .then(({ data }) => { if (data) setInLibrary(true) })
  }, [game.id])

  useEffect(() => {
    if (!showStatusMenu) return
    const handler = (e: MouseEvent) => setShowStatusMenu(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showStatusMenu])

  const displayRating = hoverRating || userRating
  const ratingsFromReviews = allReviews.filter((r: any) => r.rating)
  const userAlreadyInReviews = ratingsFromReviews.some((r: any) => r.user_id === userId)
  const allRatings = [
    ...ratingsFromReviews.map((r: any) => Number(r.rating)),
    ...(!userAlreadyInReviews && userRating > 0 ? [userRating] : []),
  ]
  const avgRating = allRatings.length > 0
    ? (allRatings.reduce((a, r) => a + r, 0) / allRatings.length).toFixed(1)
    : null

  const currentStatus = STATUS_OPTIONS.find(s => s.value === userStatus)
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: allReviews.filter((r: any) => Math.round(Number(r.rating)) === stars).length,
  }))
  const maxCount = Math.max(...ratingDistribution.map(d => d.count), 1)
  const formattedDate = formatReleaseDate(releaseDate)

  async function handleSaveStatus(val: string) {
    setUserStatus(val)
    setShowStatusMenu(false)
    const { data: existing } = await supabase.from('library').select('id').eq('user_id', userId).eq('game_id', game.id).maybeSingle()
    if (existing) {
      await supabase.from('library').update({ status: val }).eq('id', existing.id)
    } else {
      await supabase.from('library').insert({ user_id: userId, game_id: game.id, status: val })
    }
    setInLibrary(true)
  }

  async function handleSaveRating(val: number) {
    if (val === 0) return
    const { data: existing } = await supabase.from('library').select('id').eq('user_id', userId).eq('game_id', game.id).maybeSingle()
    if (existing) {
      await supabase.from('library').update({ rating: val }).eq('id', existing.id)
    } else {
      await supabase.from('library').insert({ user_id: userId, game_id: game.id, status: 'backlog', rating: val })
    }
    setInLibrary(true)
  }

  async function handlePublish() {
    if (userRating === 0) return
    const { data: existing } = await supabase.from('library').select('id').eq('user_id', userId).eq('game_id', game.id).maybeSingle()
    const updateData: any = { rating: userRating }
    if (reviewText.trim()) updateData.review = reviewText.trim()
    if (existing) {
      await supabase.from('library').update(updateData).eq('id', existing.id)
    } else {
      await supabase.from('library').insert({ user_id: userId, game_id: game.id, status: 'backlog', ...updateData })
    }
    if (reviewText.trim()) {
      setAllReviews((prev: any[]) => [{
        id: `tmp-${Date.now()}`, user_id: userId, rating: userRating,
        review: reviewText.trim(), updated_at: new Date().toISOString(),
        profiles: { username: 'Vous', avatar_color: 'forest' },
      }, ...prev.filter((r: any) => r.user_id !== userId)])
    }
    setReviewText('')
    setShowReviewForm(false)
    setInLibrary(true)
  }

  async function handlePostDiscussion() {
    if (!newDiscTitle.trim()) return
    setPostingDisc(true)
    const { data } = await supabase.from('discussions').insert({
      game_id: game.id,
      user_id: userId,
      title: newDiscTitle.trim(),
      body: newDiscBody.trim() || null,
      images: discImages,
    }).select('id, title, body, images, created_at, user_id, profiles(username, avatar_url, avatar_color)').single()
    if (data) setDiscussions(prev => [data, ...prev])
    setNewDiscTitle('')
    setNewDiscBody('')
    setDiscImages([])
    setShowNewDiscussion(false)
    setPostingDisc(false)
  }

  async function handlePostComment() {
    if (!newComment.trim() || !openDiscussion) return
    setPostingComment(true)
    const { data } = await supabase.from('discussion_comments').insert({
      discussion_id: openDiscussion.id,
      user_id: userId,
      body: newComment.trim(),
      image_url: commentImage || null,
    }).select('id, body, image_url, created_at, user_id, profiles(username, avatar_url, avatar_color)').single()
    if (data) setDiscComments(prev => [...prev, data])
    setNewComment('')
    setCommentImage(null)
    setPostingComment(false)
  }

  async function uploadDiscussionImage(file: File): Promise<string | null> {
    if (file.size > 8 * 1024 * 1024) { alert('Image trop grande (max 8 Mo)'); return null }
    const ext  = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('discussion-images').upload(path, file, { upsert: false })
    if (error) { console.error(error); return null }
    return supabase.storage.from('discussion-images').getPublicUrl(path).data.publicUrl
  }

  async function handleDiscImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingImg(true)
    const url = await uploadDiscussionImage(file)
    if (url) setDiscImages(prev => [...prev, url])
    setUploadingImg(false)
    e.target.value = ''
  }

  async function handleCommentImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingImg(true)
    const url = await uploadDiscussionImage(file)
    if (url) setCommentImage(url)
    setUploadingImg(false)
    e.target.value = ''
  }

  async function handleJournalImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 8 * 1024 * 1024) { alert('Max 8 Mo'); return }
    setUploadingJImg(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('discussion-images').upload(path, file, { upsert: false })
    if (!error) {
      const url = supabase.storage.from('discussion-images').getPublicUrl(path).data.publicUrl
      setJImages(prev => [...prev, url])
    }
    setUploadingJImg(false)
    e.target.value = ''
  }

  async function handleSaveJournal() {
    setSavingJournal(true)
    const { data } = await supabase.from('game_journal').insert({
      game_id:  game.id,
      user_id:  userId,
      mood:     jMood,
      hours:    jHours ? parseFloat(jHours) : null,
      progress: jProgress ? parseInt(jProgress) : null,
      notes:    jNotes.trim() || null,
      images:   jImages,
    }).select('*').single()
    if (data) setJournalEntries(prev => [data, ...prev])
    setJMood('bien'); setJHours(''); setJProgress(''); setJNotes(''); setJImages([])
    setShowJournalForm(false)
    setSavingJournal(false)
  }

  async function handleDeleteJournalEntry(id: string) {
    await supabase.from('game_journal').delete().eq('id', id).eq('user_id', userId)
    setJournalEntries(prev => prev.filter(e => e.id !== id))
  }

  async function handleDeleteDiscussion(id: string) {
    await supabase.from('discussions').delete().eq('id', id).eq('user_id', userId)
    setDiscussions(prev => prev.filter(d => d.id !== id))
    if (openDiscussion?.id === id) setOpenDiscussion(null)
  }

  async function handleToggleFavorite() {
    const newVal = !isFavorite
    setIsFavorite(newVal)
    const { data: existing } = await supabase.from('library').select('id').eq('user_id', userId).eq('game_id', game.id).maybeSingle()
    if (existing) {
      await supabase.from('library').update({ is_favorite: newVal }).eq('id', existing.id)
    } else {
      await supabase.from('library').insert({ user_id: userId, game_id: game.id, status: 'backlog', is_favorite: newVal })
      setInLibrary(true)
    }
  }

  async function handleOpenListPicker() {
    const { data: existing } = await supabase.from('library').select('id').eq('user_id', userId).eq('game_id', game.id).maybeSingle()
    if (!existing) {
      await supabase.from('library').insert({ user_id: userId, game_id: game.id, status: 'backlog' })
      setInLibrary(true)
    }
    setShowListPicker(true)
  }

  return (
    <div className="min-h-screen pt-16 bg-background">

      {/* Banner */}
      <div className="relative h-[45vh] min-h-[300px] overflow-hidden">
        {game.cover_url && (
          <img src={game.cover_url} alt={game.name} className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(20px)', transform: 'scale(1.15)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="absolute top-20 left-4 md:left-8">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors glass px-3 py-1.5 rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8">

          {/* Cover + dropdown */}
          <div className="w-48 md:w-56 flex-shrink-0 mx-auto md:mx-0">
            <div className="aspect-[2/3] rounded-lg overflow-hidden neon-border shadow-2xl">
              {game.cover_url
                ? <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-secondary flex items-center justify-center text-5xl">🎮</div>
              }
            </div>

          </div>

          {/* Info */}
          <div className="flex-1 space-y-4 min-w-0">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">{game.name}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <StarRating rating={Number(avgRating ?? 0)} size="lg" />
                {avgRating && <span className="neon-text font-bold text-2xl">{avgRating}</span>}
              </div>
              {allReviews.length > 0 && (
                <span className="text-sm text-muted-foreground">({allReviews.length} avis)</span>
              )}
              {game.views > 0 && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  {game.views.toLocaleString()} vues
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {formattedDate && (
                <div className="glass rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-3.5 h-3.5" /><span className="text-xs">Sortie</span></div>
                  <p className="font-semibold text-sm text-foreground leading-tight">{formattedDate}</p>
                </div>
              )}
              {developer && (
                <div className="glass rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="w-3.5 h-3.5" /><span className="text-xs">Studio</span></div>
                  <p className="font-semibold text-sm text-foreground truncate">{developer}</p>
                </div>
              )}
              {platforms.length > 0 && (
                <div className="glass rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Monitor className="w-3.5 h-3.5" /><span className="text-xs">Plateformes</span></div>
                  <p className="font-semibold text-sm text-foreground truncate">{platforms.slice(0, 3).join(', ')}</p>
                </div>
              )}
              {publisher && (
                <div className="glass rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Tag className="w-3.5 h-3.5" /><span className="text-xs">Éditeur</span></div>
                  <p className="font-semibold text-sm text-foreground truncate">{publisher}</p>
                </div>
              )}
            </div>
            {igdbGenres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {igdbGenres.map(g => (
                  <span key={g} className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{g}</span>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* ── Buttons row: status + actions on same line ── */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Status dropdown — same width as cover */}
          <div className="relative w-48 md:w-56 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {!userStatus ? (
              <button
                onClick={() => setShowStatusMenu(v => !v)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <span className="text-base">+</span> Ajouter à ma collection
              </button>
            ) : (
              <button
                onClick={() => setShowStatusMenu(v => !v)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
                style={{
                  background: `${currentStatus!.color}22`,
                  color: currentStatus!.color,
                  border: `1.5px solid ${currentStatus!.color}55`,
                }}
              >
                <Check className="w-4 h-4" />
                {currentStatus!.label}
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
              </button>
            )}
            {showStatusMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl border border-border bg-[hsl(var(--background))]">
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Statut</p>
                {STATUS_OPTIONS.map(s => {
                  const Icon = s.icon
                  return (
                    <button key={s.value} onClick={() => handleSaveStatus(s.value)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60 transition-colors text-left"
                      style={{ color: userStatus === s.value ? s.color : 'var(--foreground)' }}>
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                      {s.label}
                      {userStatus === s.value && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: s.color }} />}
                    </button>
                  )
                })}
                <button onClick={handleOpenListPicker}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60 transition-colors text-left text-muted-foreground border-t border-border">
                  <List className="w-4 h-4 flex-shrink-0" />
                  Ajouter à une liste
                  <ChevronDown className="w-3.5 h-3.5 ml-auto rotate-[-90deg]" />
                </button>
              </div>
            )}
          </div>

          {/* Action buttons — same row */}
          <button onClick={() => { setShowReviewForm(true); setActiveTab('community') }}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Écrire un avis
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`px-4 py-2.5 rounded-lg glass font-semibold text-sm transition-colors flex items-center gap-2 ${
              isFavorite
                ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                : 'text-foreground hover:bg-secondary/60'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-400' : ''}`} />
            {isFavorite ? 'En favoris' : 'Favori'}
          </button>
          <button className="px-4 py-2.5 rounded-lg glass font-semibold text-sm text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Partager
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <div className="flex gap-1 overflow-x-auto bg-secondary/40 backdrop-blur-sm border border-border p-1 rounded-xl">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              )
            })}
          </div>

          {/* VUE D'ENSEMBLE */}
          {activeTab === 'overview' && (
            <div className="mt-6 space-y-8">
              <div className="glass rounded-xl p-6 space-y-3 neon-border">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" /> Votre note
                </p>
                <div className="flex items-center gap-4">
                  <StarRating rating={displayRating} size="lg" interactive step={0.25}
                    onChange={val => { setUserRating(val); handleSaveRating(val) }}
                    onHover={setHoverRating} />
                  {displayRating > 0 && (
                    <span className="neon-text font-bold text-xl">{displayRating.toFixed(2).replace(/\.?0+$/, '')}/5</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Cliquez précisément sur l'étoile pour choisir 0.25, 0.50, 0.75 ou 1.00</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> Liens externes
                  </h3>
                  <div className="space-y-2">
                    {websites.official && (
                      <a href={websites.official} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Site officiel
                      </a>
                    )}
                    {websites.steam && (
                      <a href={websites.steam} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Steam
                      </a>
                    )}
                    {websites.wikipedia && (
                      <a href={websites.wikipedia} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Wikipedia
                      </a>
                    )}
                    {!websites.official && !websites.steam && !websites.wikipedia && (
                      <p className="text-sm text-muted-foreground italic">Aucun lien disponible</p>
                    )}
                  </div>
                </div>
                <div className="glass rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Infos
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {developer && <p><span className="text-foreground font-medium">Dev :</span> {developer}</p>}
                    {publisher && publisher !== developer && <p><span className="text-foreground font-medium">Éditeur :</span> {publisher}</p>}
                    {formattedDate && <p><span className="text-foreground font-medium">Sortie :</span> {formattedDate}</p>}
                    {igdbGenres.length > 0 && <p><span className="text-foreground font-medium">Genres :</span> {igdbGenres.join(', ')}</p>}
                  </div>
                </div>
                <div className="glass rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Popularité
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Avis</span><span className="text-foreground font-semibold">{allReviews.length}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Note moyenne</span><span className="text-primary font-semibold">{avgRating ?? '—'}/5</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Plateformes</span><span className="text-foreground font-semibold">{platforms.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {igdbSimilar.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-4">Jeux similaires</h2>
                  <CarouselSection games={igdbSimilar} supabase={supabase} router={router}
                    offset={carouselOffset} setOffset={setCarouselOffset} />
                </section>
              )}
            </div>
          )}

          {/* MÉDIAS */}
          {activeTab === 'media' && (
            <div className="mt-6 space-y-10">
              {videos.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" /> Vidéos & Trailers
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videos.map((v, i) => (
                      <div key={i}>
                        {settings.autoplayTrailers ? (
                          <div className="relative aspect-video rounded-xl overflow-hidden glass neon-border">
                            <iframe
                              src={`https://www.youtube.com/embed/${v.videoId}?autoplay=1&mute=1`}
                              title={v.title}
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              className="w-full h-full border-0"
                            />
                          </div>
                        ) : (
                          <a href={v.url} target="_blank" rel="noopener noreferrer"
                            className="relative aspect-video rounded-xl overflow-hidden glass neon-border group cursor-pointer block">
                            <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes("hqdefault")) { t.src = `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg` } else { t.src = `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg` } }} />
                            <div className="absolute inset-0 bg-background/40 flex items-center justify-center group-hover:bg-background/20 transition-colors">
                              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                                <Play className="w-8 h-8 text-primary-foreground ml-1" />
                              </div>
                            </div>
                            <div className="absolute bottom-3 left-3 glass px-3 py-1 rounded-lg text-xs font-medium text-foreground">
                              {v.title}
                            </div>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {screenshots.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" /> Screenshots ({screenshots.length})
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {screenshots.map((s, i) => (
                      <div key={i} onClick={() => setLightbox(s.url)}
                        className="aspect-video rounded-xl overflow-hidden glass group cursor-pointer">
                        <img src={s.thumb} alt={`Screenshot ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {artworks.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" /> Artworks
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {artworks.map((a, i) => (
                      <div key={i} onClick={() => setLightbox(a.url)}
                        className="aspect-video rounded-xl overflow-hidden glass group cursor-pointer">
                        <img src={a.thumb} alt={`Artwork ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 saturate-150" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {videos.length === 0 && screenshots.length === 0 && artworks.length === 0 && (
                <div className="glass rounded-xl p-8 text-center text-muted-foreground">
                  <Image className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold">Aucun média disponible</p>
                </div>
              )}
            </div>
          )}

          {/* COMMUNAUTÉ */}
          {activeTab === 'community' && (
            <div className="mt-6 space-y-10">

              {/* ── Avis ── */}
              <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" /> Avis ({allReviews.length})
                </h2>
                {!allReviews.some((r: any) => r.user_id === userId) && (
                  <button onClick={() => setShowReviewForm(v => !v)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                    <Send className="w-4 h-4" /> Écrire un avis
                  </button>
                )}
              </div>
              {showReviewForm && (
                <div className="glass rounded-xl p-6 space-y-4 neon-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">
                      {allReviews.some((r: any) => r.user_id === userId) ? 'Modifier mon avis' : `Avis pour ${game.name}`}
                    </h3>
                    <button onClick={() => setShowReviewForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Note :</span>
                    <StarRating rating={displayRating} size="md" interactive step={0.25} onChange={setUserRating} onHover={setHoverRating} />
                    {displayRating > 0 && <span className="neon-text font-bold text-sm">{displayRating.toFixed(2).replace(/\.?0+$/, '')}/5</span>}
                  </div>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                    placeholder="Partagez votre avis sur ce jeu..." rows={4}
                    className="w-full rounded-lg bg-secondary/50 border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                  <div className="flex justify-end">
                    <button disabled={userRating === 0 || !reviewText.trim()} onClick={handlePublish}
                      className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Send className="w-4 h-4" /> Publier
                    </button>
                  </div>
                </div>
              )}
              {allReviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allReviews.map((r: any) => (
                    <div key={r.id} className="relative">
                      <ReviewCard review={{ id: r.id, username: r.profiles?.username ?? 'Joueur', avatar_color: r.profiles?.avatar_color, avatar_url: r.profiles?.avatar_url ?? undefined, rating: r.rating, review: r.review, updated_at: r.updated_at, likes: r.likes ?? 0, likedByMe: r.likedByMe ?? false }} currentUserId={userId} />
                      {r.user_id === userId && (
                        <button onClick={() => { setReviewText(r.review ?? ''); setShowReviewForm(true) }}
                          className="absolute bottom-3 right-3 z-10 p-1.5 rounded-lg glass text-muted-foreground hover:text-primary transition-colors" title="Modifier">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center">
                  <p className="text-muted-foreground">Aucun avis pour le moment. Soyez le premier !</p>
                </div>
              )}
              </section>

              {/* ── Discussions ── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Discussions ({discussions.length})
                  </h2>
                  <button onClick={() => setShowNewDiscussion(v => !v)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Nouvelle discussion
                  </button>
                </div>

                {/* New discussion form */}
                {showNewDiscussion && (
                  <div className="glass rounded-xl p-6 space-y-4 neon-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Créer une discussion</h3>
                      <button onClick={() => setShowNewDiscussion(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                    <input
                      value={newDiscTitle}
                      onChange={e => setNewDiscTitle(e.target.value)}
                      placeholder="Titre de la discussion…"
                      className="w-full rounded-lg bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <textarea
                      value={newDiscBody}
                      onChange={e => setNewDiscBody(e.target.value)}
                      placeholder="Description (optionnel)…"
                      rows={3}
                      className="w-full rounded-lg bg-secondary/50 border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    {/* Image previews */}
                    {discImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {discImages.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="h-24 w-auto rounded-lg object-cover border border-border" />
                            <button onClick={() => setDiscImages(prev => prev.filter((_, j) => j !== i))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => discImgRef.current?.click()}
                        disabled={uploadingImg}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg glass text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {uploadingImg
                          ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <><ImagePlus className="w-4 h-4" /> Ajouter une image</>
                        }
                      </button>
                      <input ref={discImgRef} type="file" accept="image/*" className="hidden" onChange={handleDiscImageUpload} />
                      <button disabled={!newDiscTitle.trim() || postingDisc} onClick={handlePostDiscussion}
                        className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                        {postingDisc ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Publier</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Open discussion thread */}
                {openDiscussion && (
                  <div className="glass rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
                      <button onClick={() => setOpenDiscussion(null)} className="text-muted-foreground hover:text-foreground">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                      </button>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{openDiscussion.title}</h3>
                        <p className="text-xs text-muted-foreground">par {openDiscussion.profiles?.username ?? 'Joueur'} · {openDiscussion.created_at?.slice(0, 10)}</p>
                      </div>
                      {openDiscussion.user_id === userId && (
                        <button onClick={() => handleDeleteDiscussion(openDiscussion.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {(openDiscussion.body || openDiscussion.images?.length > 0) && (
                      <div className="px-5 py-4 border-b border-border space-y-3">
                        {openDiscussion.body && <p className="text-sm text-muted-foreground">{openDiscussion.body}</p>}
                        {openDiscussion.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {openDiscussion.images.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt="" className="h-40 w-auto rounded-lg object-cover border border-border hover:opacity-90 transition-opacity cursor-zoom-in" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="divide-y divide-border max-h-80 overflow-y-auto">
                      {discComments.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">Aucun commentaire. Soyez le premier !</p>
                      )}
                      {discComments.map((c: any) => {
                        const color = ({forest:'#22c55e',ocean:'#3b82f6',fire:'#f97316',violet:'#a855f7',rose:'#ec4899',gold:'#f59e0b',ice:'#06b6d4',slate:'#64748b'} as any)[c.profiles?.avatar_color] ?? '#22c55e'
                        return (
                          <div key={c.id} className="flex gap-3 px-5 py-3">
                            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ring-1 ring-border">
                              {c.profiles?.avatar_url
                                ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: color }}>
                                    {(c.profiles?.username ?? '?')[0].toUpperCase()}
                                  </div>
                              }
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-foreground">{c.profiles?.username ?? 'Joueur'} <span className="text-muted-foreground font-normal">· {c.created_at?.slice(0, 10)}</span></p>
                              <p className="text-sm text-muted-foreground mt-0.5">{c.body}</p>
                            {c.image_url && (
                              <a href={c.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                                <img src={c.image_url} alt="" className="max-h-48 rounded-lg object-cover border border-border hover:opacity-90 transition-opacity cursor-zoom-in" />
                              </a>
                            )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="border-t border-border">
                      {commentImage && (
                        <div className="relative px-4 pt-3 inline-block">
                          <img src={commentImage} alt="" className="h-20 rounded-lg border border-border" />
                          <button onClick={() => setCommentImage(null)}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2 p-4">
                        <button type="button" onClick={() => commentImgRef.current?.click()} disabled={uploadingImg}
                          className="p-2.5 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                          {uploadingImg ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                        </button>
                        <input ref={commentImgRef} type="file" accept="image/*" className="hidden" onChange={handleCommentImageUpload} />
                        <input
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment() } }}
                          placeholder="Écrire un commentaire…"
                          className="flex-1 rounded-lg bg-secondary/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button disabled={(!newComment.trim() && !commentImage) || postingComment} onClick={handlePostComment}
                          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40 flex items-center gap-2">
                          {postingComment ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discussion list */}
                {!openDiscussion && (
                  <div className="space-y-2">
                    {discussions.length === 0 && !showNewDiscussion && (
                      <div className="glass rounded-xl p-8 text-center">
                        <p className="text-muted-foreground text-sm">Aucune discussion. Lancez le débat !</p>
                      </div>
                    )}
                    {discussions.map((d: any) => (
                      <button key={d.id} onClick={() => setOpenDiscussion(d)}
                        className="w-full glass rounded-xl p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group text-left">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground">par {d.profiles?.username ?? 'Joueur'} · {d.created_at?.slice(0, 10)}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-4">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

            </div>
          )}

          {/* STATISTIQUES */}
          {activeTab === 'stats' && (
            <div className="mt-6 space-y-8">
              <div className="glass rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Distribution des notes
                </h2>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="neon-text font-bold text-5xl">{avgRating ?? '—'}</p>
                    <StarRating rating={Number(avgRating ?? 0)} size="md" />
                    <p className="text-sm text-muted-foreground mt-1">{allReviews.length} avis</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {ratingDistribution.map(d => (
                      <div key={d.stars} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-4">{d.stars}</span>
                        <span className="text-primary text-xs">★</span>
                        <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-6 text-right">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {platforms.length > 0 && (
                <div className="glass rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" /> Plateformes disponibles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map(p => (
                      <span key={p} className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* JOURNAL */}
          {activeTab === 'journal' && (
            <div className="mt-6 space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Journal de jeu
                </h2>
                <button onClick={() => setShowJournalForm(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                  <PlusCircle className="w-4 h-4" /> Ajouter
                </button>
              </div>

              {/* Form */}
              {showJournalForm && (
                <div className="glass rounded-xl p-6 border border-border space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Nouvelle entrée</h3>
                    <button onClick={() => setShowJournalForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>

                  {/* Mood */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Humeur de la session</p>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: 'incroyable', label: 'Incroyable', icon: Heart,   color: '#ec4899' },
                        { value: 'bien',       label: 'Bien',       icon: Smile,   color: '#22c55e' },
                        { value: 'neutre',     label: 'Neutre',     icon: Meh,     color: '#f59e0b' },
                        { value: 'bof',        label: 'Bof',        icon: Frown,   color: '#ef4444' },
                      ].map(m => {
                        const Icon = m.icon
                        const active = jMood === m.value
                        return (
                          <button key={m.value} onClick={() => setJMood(m.value)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                              active
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            }`}>
                            <Icon className="w-4 h-4" /> {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Hours + Progress */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Heures jouées</label>
                      <input type="number" min="0" step="0.5" value={jHours} onChange={e => setJHours(e.target.value)}
                        placeholder="Ex: 2.5"
                        className="w-full px-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Progression (%)</label>
                      <input type="number" min="0" max="100" value={jProgress} onChange={e => setJProgress(e.target.value)}
                        placeholder="Ex: 45"
                        className="w-full px-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>

                  {/* Notes */}
                  <textarea value={jNotes} onChange={e => setJNotes(e.target.value)}
                    placeholder="Notes sur cette session..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />

                  {/* Images */}
                  {jImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {jImages.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="" className="h-24 w-auto rounded-lg object-cover border border-border" />
                          <button onClick={() => setJImages(prev => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => journalImgRef.current?.click()} disabled={uploadingJImg}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg glass text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {uploadingJImg
                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <><ImagePlus className="w-4 h-4" /> Ajouter des images</>
                      }
                    </button>
                    <input ref={journalImgRef} type="file" accept="image/*" className="hidden" onChange={handleJournalImageUpload} />
                    <button onClick={handleSaveJournal} disabled={savingJournal}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                      {savingJournal
                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : 'Enregistrer'
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Entries list */}
              {journalEntries.length === 0 && !showJournalForm ? (
                <div className="glass rounded-xl p-10 text-center text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Aucune entrée dans votre journal.</p>
                  <p className="text-sm mt-1">Suivez votre progression et vos sessions de jeu !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {journalEntries.map((entry: any) => {
                    const moodConfig: Record<string, { icon: any; color: string; label: string }> = {
                      incroyable: { icon: Heart,  color: '#ec4899', label: 'Incroyable' },
                      bien:       { icon: Smile,  color: '#22c55e', label: 'Bien'       },
                      neutre:     { icon: Meh,    color: '#f59e0b', label: 'Neutre'     },
                      bof:        { icon: Frown,  color: '#ef4444', label: 'Bof'        },
                    }
                    const mood = moodConfig[entry.mood] ?? moodConfig.bien
                    const MoodIcon = mood.icon
                    return (
                      <div key={entry.id} className="glass rounded-xl p-5 border border-border space-y-4 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground">
                              <MoodIcon className="w-3.5 h-3.5" /> {mood.label}
                            </span>
                            {entry.hours && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                                {entry.hours}h jouées
                              </span>
                            )}
                            {entry.progress != null && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                                {entry.progress}% complété
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">{entry.created_at?.slice(0, 10)}</span>
                            <button onClick={() => handleDeleteJournalEntry(entry.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {entry.progress != null && (
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${entry.progress}%` }} />
                          </div>
                        )}

                        {entry.notes && <p className="text-sm text-muted-foreground leading-relaxed">{entry.notes}</p>}

                        {entry.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {entry.images.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt="" className="h-32 w-auto rounded-lg object-cover border border-border hover:opacity-90 transition-opacity cursor-zoom-in" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="pb-16" />
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={lightbox} alt="Media" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {showListPicker && (
        <ListPickerModal userId={userId} gameId={game.id} gameName={game.name}
          onClose={() => { setShowListPicker(false); router.refresh() }} />
      )}
    </div>
  )
}

// Carousel
function CarouselSection({ games, supabase, router, offset, setOffset }: {
  games: any[]; supabase: any; router: any; offset: number; setOffset: (fn: (o: number) => number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const CARD_W = 160
  const getMax = () => {
    const w = containerRef.current?.offsetWidth ?? 1200
    return Math.max(0, (games.length - Math.floor(w / CARD_W)) * CARD_W)
  }
  return (
    <div ref={containerRef} className="relative overflow-hidden w-full">
      <div className="flex gap-4 pb-3 transition-transform duration-300" style={{ transform: `translateX(-${offset}px)` }}>
        {games.map((g: any, i: number) => (
          <div key={g.id} className="flex-shrink-0 w-36">
            <SimilarGameCard game={g} index={i} supabase={supabase} router={router} />
          </div>
        ))}
      </div>
      {offset > 0 && (
        <button onClick={() => setOffset(o => Math.max(0, o - CARD_W * 3))}
          className="absolute left-0 top-1/3 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center text-foreground shadow-lg z-10 text-lg font-bold">‹</button>
      )}
      {offset < getMax() && (
        <button onClick={() => setOffset(o => Math.min(getMax(), o + CARD_W * 3))}
          className="absolute right-0 top-1/3 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center text-foreground shadow-lg z-10 text-lg font-bold">›</button>
      )}
    </div>
  )
}

function SimilarGameCard({ game, index, supabase, router }: { game: any; index: number; supabase: any; router: any }) {
  const [loading, setLoading] = useState(false)
  const year = game.released_at ? new Date(game.released_at).getFullYear() : null
  async function handleClick() {
    if (loading) return
    if (game.id && !String(game.id).match(/^\d+$/)) { router.push(`/games/${game.id}`); return }
    setLoading(true)
    try {
      const igdbId = game.igdb_id ?? game.id
      const { data: existing } = await supabase.from('games').select('id').eq('igdb_id', igdbId).maybeSingle()
      let gameId: string
      if (existing?.id) {
        gameId = existing.id
      } else {
        const { data: newGame } = await supabase.from('games').insert({
          igdb_id: igdbId, name: game.name, cover_url: game.cover_url,
          genres: game.genres ?? [], platforms: game.platforms ?? [], released_at: game.released_at,
        }).select('id').single()
        gameId = newGame!.id
      }
      router.push(`/games/${gameId}`)
    } catch { setLoading(false) }
  }
  return (
    <button onClick={handleClick} className="block text-left game-card-hover group w-full" disabled={loading}>
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
        {game.cover_url
          ? <img src={game.cover_url.replace(/t_[a-z0-9_]+/, 't_cover_big')} alt={game.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
        }
        {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{game.name}</h3>
        {year && <p className="text-xs text-muted-foreground">{year}</p>}
      </div>
    </button>
  )
}