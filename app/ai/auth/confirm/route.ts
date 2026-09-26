import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiBasePath } from '@/lib/ai/host'

export const dynamic = 'force-dynamic'

type OtpType = 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change'

const OTP_TYPES: OtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']

/**
 * Landing point for Supabase email links (sign-up confirmation, magic link,
 * recovery). Public URL: /auth/confirm on the chat subdomain, /ai/auth/confirm
 * on the main domain. The middleware leaves /ai/auth/* ungated.
 *
 * Handles both link styles: PKCE (`?code=`) and token hash
 * (`?token_hash=&type=`). On success the session cookies are set and the
 * user lands in the chat; on failure they land on the login page with the
 * reason.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const base = aiBasePath(host)
  const home = `${url.origin}${base || '/'}`
  const login = `${url.origin}${base}/login`

  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const rawType = url.searchParams.get('type')
  const type = OTP_TYPES.find((t) => t === rawType) ?? null

  const supabase = createClient()
  let error: string | null = null
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error?.message ?? null
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    error = result.error?.message ?? null
  } else {
    error = 'The confirmation link is incomplete. Open it from the email again.'
  }

  if (error) {
    console.error('[auth/confirm] failed', error)
    return NextResponse.redirect(`${login}?error=${encodeURIComponent(error)}`)
  }
  return NextResponse.redirect(home)
}
