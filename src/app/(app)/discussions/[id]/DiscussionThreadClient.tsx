'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, ImagePlus, X, MessageSquare, Trash2, Flag, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const AVATAR_COLORS: Record<string, string> = {
  forest: '#22c55e', ocean: '#3b82f6', fire: '#f97316',
  violet: '#a855f7', rose:  '#ec4899', gold: '#f59e0b',
  ice:    '#06b6d4', slate: '#64748b',
}

function Avatar({ profile, size = 10 }: { profile: any; size?: number }) {
  const sz   = `${size * 4}px`
  const color = AVATAR_COLORS[profile?.avatar_color ?? 'forest'] ?? '#22c55e'
  const init  = (profile?.username ?? '?')[0].toUpperCase()
  if (profile?.avatar_url) return (
    <img src={profile.avatar_url} alt={profile.username}
      className="rounded-full object-cover flex-shrink-0 ring-2 ring-border"
      style={{ width: sz, height: sz }} />
  )
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ring-2 ring-border"
      style={{ width: sz, height: sz, backgroundColor: color, fontSize: size > 8 ? '1rem' : '0.7rem' }}>
      {init}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function DiscussionThreadClient({
  discussion, initialComments, userId
}: {
  discussion: any
  initialComments: any[]
  userId: string
}) {
  const supabase = createClient()
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [comments,      setComments]      = useState(initialComments)
  const [newComment,    setNewComment]    = useState('')
  const [commentImage,  setCommentImage]  = useState<string | null>(null)
  const [posting,       setPosting]       = useState(false)
  const [imageSpoiler,  setImageSpoiler]  = useState(false)
  const [uploadingImg,  setUploadingImg]  = useState(false)

  const gameId = discussion.games?.id

  async function handlePost() {
    if ((!newComment.trim() && !commentImage) || posting) return
    setPosting(true)
    const { data: c } = await supabase
      .from('discussion_comments')
      .insert({ discussion_id: discussion.id, user_id: userId, body: newComment.trim(), image_url: commentImage, image_spoiler: imageSpoiler })
      .select('*, profiles(username, avatar_color, avatar_url)')
      .single()
    if (c) {
      setComments(prev => [...prev, c])
      setNewComment('')
      setCommentImage(null)
      setImageSpoiler(false)
    }
    setPosting(false)
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from('discussion_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  async function handleDeleteDiscussion() {
    await supabase.from('discussions').delete().eq('id', discussion.id)
    router.push(gameId ? `/games/${gameId}` : '/discover')
  }

  async function handleReport(targetType: 'discussion' | 'comment', targetId: string) {
    // Essaie les deux schémas possibles
    const { error } = await supabase.from('reports').insert({
      reporter_id:  userId,
      reported_id:  targetId,
      content_type: targetType,
      reason:       'Signalement depuis le forum',
    })
    if (error) {
      // Fallback schéma alternatif
      await supabase.from('reports').insert({
        user_id:     userId,
        target_id:   targetId,
        target_type: targetType,
        reason:      'Signalement depuis le forum',
      })
    }
    alert('Signalement envoyé. Merci !')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
    const ext  = file.name.split('.').pop()
    const path = `discussion-comments/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('discussion-images').upload(path, file, { upsert: true })
    if (error) { setUploadingImg(false); alert("Erreur upload : " + error.message); return }
    const { data } = supabase.storage.from('discussion-images').getPublicUrl(path)
    setCommentImage(data.publicUrl)
    setUploadingImg(false)
    e.target.value = ''
  }

  // Tous les posts = OP + commentaires
  const allPosts = [
    {
      id: discussion.id,
      isOP: true,
      profiles: discussion.profiles,
      created_at: discussion.created_at,
      body: discussion.body,
      image_url: null,
      images: discussion.images,
    },
    ...comments.map(c => ({ ...c, isOP: false, images: null }))
  ]

  // Render body with [spoil]...[/spoil] support
  function renderBody(text: string) {
    const parts = text.split(/(\[spoil\][\s\S]*?\[\/spoil\])/gi)
    return parts.map((part, i) => {
      const match = part.match(/\[spoil\]([\s\S]*?)\[\/spoil\]/i)
      if (match) return <SpoilerBlock key={i} content={match[1]} />
      return <span key={i} className="whitespace-pre-wrap">{part}</span>
    })
  }

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          {gameId && (
            <>
              <Link href={`/games/${gameId}`}
                className="hover:text-foreground transition-colors flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                {discussion.games?.name ?? 'Jeu'}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium truncate">{discussion.title}</span>
        </div>

        {/* Thread header */}
        <div className="mb-6 pb-4 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground mb-1">{discussion.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{comments.length} réponse{comments.length > 1 ? 's' : ''}</span>
            {discussion.games?.name && (
              <>
                <span>·</span>
                <Link href={`/games/${gameId}`} className="text-primary hover:underline">
                  {discussion.games.name}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-0 divide-y divide-border border border-border rounded-xl overflow-hidden mb-6">
          {allPosts.map((post, i) => (
            <div key={post.id}
              className={`flex gap-0 ${post.isOP ? 'bg-primary/5' : i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}`}>

              {/* Left sidebar — avatar + infos */}
              <div className="w-36 flex-shrink-0 p-4 border-r border-border flex flex-col items-center gap-2 text-center">
                <Avatar profile={post.profiles} size={12} />
                <div>
                  <p className="text-sm font-bold text-foreground truncate max-w-[120px]">
                    {post.profiles?.username ?? 'Joueur'}
                  </p>
                  {post.isOP && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      OP
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  #{i + 1}
                </p>
              </div>

              {/* Right content */}
              <div className="flex-1 p-5 min-w-0">
                {/* Post header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
                  <div className="flex items-center gap-2">
                    {/* Supprimer — auteur du post ou auteur du topic (OP) */}
                    {post.isOP && discussion.user_id === userId && (
                      <button onClick={handleDeleteDiscussion}
                        title="Supprimer le topic"
                        className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!post.isOP && (post.user_id === userId || discussion.user_id === userId) && (
                      <button onClick={() => handleDeleteComment(post.id)}
                        title="Supprimer ce message"
                        className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Signaler — autres utilisateurs uniquement */}
                    {post.user_id !== userId && (
                      <button
                        onClick={() => handleReport(post.isOP ? 'discussion' : 'comment', post.id)}
                        title="Signaler ce message"
                        className="text-muted-foreground/40 hover:text-amber-400 transition-colors">
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post body */}
                {post.body ? (
                  <div className="text-sm text-foreground leading-relaxed">{renderBody(post.body)}</div>
                ) : (
                  !post.images?.length && !post.image_url && (
                    <p className="text-sm text-muted-foreground italic">Pas de contenu.</p>
                  )
                )}

                {/* Images */}
                {post.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {post.images.map((url: string, j: number) => (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="h-40 rounded-lg object-cover border border-border hover:opacity-90 transition-opacity cursor-zoom-in" />
                      </a>
                    ))}
                  </div>
                )}
                {post.image_url && (
                  post.image_spoiler
                    ? <SpoilerImage key={post.id} url={post.image_url} />
                    : <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                        <img src={post.image_url} alt="" className="max-h-64 w-auto rounded-xl border border-border hover:opacity-90 transition-opacity cursor-zoom-in" />
                      </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reply form */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30">
            <p className="text-sm font-semibold text-foreground">Répondre</p>
          </div>

          {commentImage && (
            <div className="relative px-4 pt-3 inline-block">
              <img src={commentImage} alt="" className="h-20 rounded-lg border border-border" />
              <button onClick={() => setCommentImage(null)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handlePost() }}
            placeholder="Écrire une réponse… (Ctrl+Entrée pour envoyer)"
            rows={4}
            className="w-full px-4 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => {
                  const tag = '[spoil]...[/spoil]'
                  setNewComment(prev => prev + tag)
                }}
                title="Insérer une balise spoil"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-amber-400 hover:bg-secondary transition-colors">
                <EyeOff className="w-4 h-4" /> Spoil
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                {uploadingImg
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <><ImagePlus className="w-4 h-4" /> Image</>
                }
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {commentImage && (
                <button type="button" onClick={() => setImageSpoiler(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    imageSpoiler ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground hover:bg-secondary'
                  }`}>
                  <EyeOff className="w-3.5 h-3.5" />
                  {imageSpoiler ? 'Image spoil ON' : 'Image spoil'}
                </button>
              )}
            </div>

            <button
              disabled={(!newComment.trim() && !commentImage) || posting}
              onClick={handlePost}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
              {posting
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <><Send className="w-4 h-4" /> Envoyer</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

function SpoilerBlock({ content }: { content: string }) {
  const [revealed, setRevealed] = useState(false)
  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors select-none"
      >
        <span>⚠ Spoiler</span>
        <span className="text-amber-400/60">— cliquer pour révéler</span>
      </button>
    )
  }
  return (
    <span className="relative inline-block">
      <span className="text-foreground whitespace-pre-wrap">{content}</span>
      <button
        onClick={() => setRevealed(false)}
        className="ml-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        [masquer]
      </button>
    </span>
  )
}

function SpoilerImage({ url }: { url: string }) {
  const [revealed, setRevealed] = useState(false)
  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-colors"
      >
        <EyeOff className="w-4 h-4" />
        Image spoil — cliquer pour afficher
      </button>
    )
  }
  return (
    <div className="mt-3 relative inline-block">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="" className="max-h-64 w-auto rounded-xl border border-border hover:opacity-90 transition-opacity cursor-zoom-in" />
      </a>
      <button
        onClick={() => setRevealed(false)}
        className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] hover:bg-black/80 transition-colors"
      >
        masquer
      </button>
    </div>
  )
}