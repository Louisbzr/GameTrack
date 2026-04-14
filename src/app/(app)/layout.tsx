import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/Footer'
import { SettingsProvider } from '@/components/SettingsProvider'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <SettingsProvider userId={user.id}>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </SettingsProvider>
  )
}