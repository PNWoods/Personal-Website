'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAiBase } from '@/components/ai/AiBaseProvider'

type Mode = 'signin' | 'signup' | 'sent'

const MIN_PASSWORD = 8

/** Supabase hides trigger errors behind this generic message. */
function friendlyError(message: string): string {
  if (/database error saving new user/i.test(message)) return 'Invalid invite code.'
  if (/already registered/i.test(message)) return 'That email already has an account. Sign in instead.'
  return message
}

export default function AiLoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [invite, setInvite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { href } = useAiBase()

  // The confirmation route reports failures via ?error=.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) setError(err)
      if (params.get('mode') === 'signup') setMode('signup')
    } catch {
      // no window
    }
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setConfirm('')
    setInvite('')
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(href('/'))
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for the password.`)
      return
    }
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setLoading(true)
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        // Checked by the on_auth_user_signup_invite trigger (migration 0012).
        data: { invite_code: invite.trim() },
        emailRedirectTo: `${window.location.origin}${href('/auth/confirm')}`,
      },
    })
    setLoading(false)
    if (error) {
      setError(friendlyError(error.message))
      return
    }
    if (data.session) {
      // Email confirmation is off for this project: signed in already.
      router.push(href('/'))
      router.refresh()
      return
    }
    // With confirmation on, Supabase returns a user with no identities when
    // the address is already taken (to avoid leaking accounts). Say so.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setError('That email already has an account. Sign in instead.')
      return
    }
    setMode('sent')
  }

  const inputClass =
    'h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-lg text-white placeholder-white/40 outline-none focus:border-blue-500'
  const buttonClass =
    'h-14 w-full rounded-xl bg-blue-600 text-lg font-semibold active:bg-blue-500 disabled:opacity-50'
  const linkClass = 'text-sm text-white/60 hover:text-white'

  if (mode === 'sent') {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-sm text-white/70">
            We sent a confirmation link to <span className="text-white">{email}</span>. Open it
            on this device to finish creating your account.
          </p>
          <button type="button" onClick={() => switchMode('signin')} className={linkClass}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  const signup = mode === 'signup'

  return (
    <div className="flex h-full items-center justify-center px-4">
      <form onSubmit={signup ? handleSignUp : handleSignIn} className="w-full max-w-sm space-y-4">
        <h1 className="mb-6 text-center text-2xl font-bold">{signup ? 'Create account' : 'Chat'}</h1>
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          placeholder={signup ? `Password (${MIN_PASSWORD}+ characters)` : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          minLength={signup ? MIN_PASSWORD : undefined}
          required
        />
        {signup && (
          <>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              required
            />
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              placeholder="Invite code"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-white/40">
              Ask Patrick for the invite code. You&apos;ll get a confirmation email after this step.
            </p>
          </>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? (signup ? 'Creating…' : 'Signing in…') : signup ? 'Create account' : 'Sign in'}
        </button>
        <p className="text-center">
          {signup ? (
            <button type="button" onClick={() => switchMode('signin')} className={linkClass}>
              Already have an account? Sign in
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('signup')} className={linkClass}>
              New here? Create an account
            </button>
          )}
        </p>
      </form>
    </div>
  )
}
