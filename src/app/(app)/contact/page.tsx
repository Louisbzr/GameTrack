import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContactClient from './ContactClient'

export const dynamic = 'force-dynamic'

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ContactClient userId={user.id} userEmail={user.email ?? ''} />
}