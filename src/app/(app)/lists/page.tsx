import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ListsClient from './ListsClient'

export default async function ListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lists } = await supabase
    .from('lists')
    .select('id, title, description, is_public, created_at, list_games(id, added_at, games(id, name, cover_url, genres, released_at))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: library } = await supabase
    .from('library')
    .select('id, status, rating, games(id, name, cover_url, released_at, genres, platforms)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <ListsClient
      userId={user.id}
      lists={lists as any}
      library={(library || []) as any}
    />
  )
}