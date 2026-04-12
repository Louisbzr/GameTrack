import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import ReleasesClient from './ReleasesClient'

export const metadata = { title: 'Sorties de la semaine – GameTrack' }

export default async function ReleasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <Navbar />
      <ReleasesClient />
    </>
  )
}