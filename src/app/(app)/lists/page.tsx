import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ListsClient from './ListsClient'

export default async function ListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupère les listes — si la table n'existe pas encore, data = null
  const { data: lists, error } = await supabase
    .from('lists')
    .select(`
      id, title, description, is_public, created_at,
      list_games(
        id, added_at,
        games(id, name, cover_url, genres)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ListsPage]', error.message)
  }

  // Normalise les list_games : Supabase peut retourner null ou un objet selon la query
  const safeLists = (lists ?? []).map((l: any) => ({
    ...l,
    list_games: Array.isArray(l.list_games) ? l.list_games : [],
  }))

  return <ListsClient userId={user.id} lists={safeLists} />
}