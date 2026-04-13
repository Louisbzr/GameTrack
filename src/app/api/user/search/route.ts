import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ users: [] })

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, avatar_color, level, xp')
    .ilike('username', `%${q}%`)
    .limit(5)

  return NextResponse.json({ users: data ?? [] })
}