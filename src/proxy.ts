import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected =
    pathname.startsWith('/library') ||
    pathname.startsWith('/feed') ||
    pathname.startsWith('/discover') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/lists') ||
    pathname.startsWith('/friends') ||
    pathname.startsWith('/steam')

  const isAuth =
    pathname === '/login' ||
    pathname === '/register'

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuth) {
    return NextResponse.redirect(new URL('/library', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}