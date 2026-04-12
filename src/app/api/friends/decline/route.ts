import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { friendshipId } = await req.json()

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`addressee_id.eq.${user.id},requester_id.eq.${user.id}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}