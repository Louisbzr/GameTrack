// src/app/(app)/discussions/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DiscussionThreadClient from './DiscussionThreadClient'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function DiscussionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: discussion } = await supabase
    .from('discussions')
    .select('*, profiles(username, avatar_color, avatar_url), games(id, name, cover_url)')
    .eq('id', id)
    .maybeSingle()

  if (!discussion) notFound()

  const { data: comments } = await supabase
    .from('discussion_comments')
    .select('*, profiles(username, avatar_color, avatar_url)')
    .eq('discussion_id', id)
    .order('created_at', { ascending: true })

  return (
    <DiscussionThreadClient
      discussion={discussion}
      initialComments={comments ?? []}
      userId={user.id}
    />
  )
}