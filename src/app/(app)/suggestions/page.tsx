import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuggestionsClient from './SuggestionsClient'

export const dynamic = 'force-dynamic'

export default async function SuggestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <SuggestionsClient userId={user.id} />
}