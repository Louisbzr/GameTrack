import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SteamImportClient from './SteamImportClient'

export default async function SteamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <SteamImportClient userId={user.id} />
}