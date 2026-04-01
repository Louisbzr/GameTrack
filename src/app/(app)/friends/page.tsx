import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FriendsClient from './FriendsClient'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: friendships } = await supabase
    .from('friendships')
    .select(`
      id, requester_id, addressee_id, status,
      requester:profiles!friendships_requester_id_fkey(id, username, level, avatar_url),
      addressee:profiles!friendships_addressee_id_fkey(id, username, level, avatar_url)
    `)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const accepted        = (friendships || []).filter(f => f.status === 'accepted') as any[]
  const pendingReceived = (friendships || []).filter(f => f.status === 'pending' && f.addressee_id === user.id) as any[]
  const pendingSent     = (friendships || []).filter(f => f.status === 'pending' && f.requester_id === user.id) as any[]

  const friends = accepted.map((f: any) => {
    const isMeRequester = f.requester_id === user.id
    return isMeRequester ? f.addressee : f.requester
  }).filter(Boolean)

  return (
    <FriendsClient
      userId={user.id}
      friends={friends}
      pendingReceived={pendingReceived}
      pendingSent={pendingSent}
    />
  )
}