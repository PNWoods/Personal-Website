import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AI_HOST, isAiHost } from '@/lib/ai/host'

/**
 * Two jobs:
 * 1. Serve the chat app at AI_HOST (ai.pnwoods.com) by rewriting that host's
 *    requests onto the /ai route group. Public URLs on the subdomain are
 *    / and /login; on the main domain they are /ai and /ai/login.
 * 2. Gate /ai and /workouts behind the Supabase session, refreshing cookies.
 *
 * /api/* is never rewritten or gated here: route handlers verify auth themselves.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const onAiHost = isAiHost(host)
  const base = onAiHost ? '' : '/ai'

  if (pathname.startsWith('/api/')) return NextResponse.next()

  let rewriteUrl: URL | null = null
  let internal = pathname
  if (onAiHost) {
    internal = pathname === '/' ? '/ai' : `/ai${pathname}`
    rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = internal
  }

  const isAi = internal === '/ai' || internal.startsWith('/ai/')
  const isWorkouts = internal.startsWith('/workouts')

  // Public pages: no Supabase round-trip.
  if (!isAi && !isWorkouts) return NextResponse.next()

  // In production the chat app lives only on its subdomain.
  if (!onAiHost && isAi && process.env.VERCEL_ENV === 'production') {
    const publicPath = internal.slice('/ai'.length) || '/'
    return NextResponse.redirect(
      `https://${AI_HOST}${publicPath}${request.nextUrl.search}`
    )
  }

  const makeResponse = () =>
    rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, { request })
      : NextResponse.next({ request })

  let response = makeResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = makeResponse()
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isAi) {
    const isLoginPage = internal === '/ai/login'
    // Email confirmation / magic-link landing: reachable without a session.
    const isAuthCallback = internal.startsWith('/ai/auth/')

    if (isAuthCallback) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }
    if (!user && !isLoginPage) {
      return NextResponse.redirect(new URL(`${base}/login`, request.url))
    }
    if (user && isLoginPage) {
      return NextResponse.redirect(new URL(base || '/', request.url))
    }

    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return response
  }

  const isLoginPage = internal === '/workouts/login'

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/workouts/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/workouts'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|ico|webp|txt|xml|pdf)$).*)',
  ],
}
