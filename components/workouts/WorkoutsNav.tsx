'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function WorkoutsNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/workouts/login') return null

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/workouts/login')
    router.refresh()
  }

  const linkClass =
    'flex h-12 items-center rounded-lg px-4 text-sm font-medium text-white/70 hover:text-white active:bg-white/10'

  return (
    <nav className="mb-6 flex items-center gap-1 border-b border-white/10 pb-3">
      <Link href="/workouts" className={linkClass}>
        Dashboard
      </Link>
      <Link href="/workouts/new" className={linkClass}>
        Plan
      </Link>
      <Link href="/workouts/exercises" className={linkClass}>
        Exercises
      </Link>
      <button type="button" onClick={signOut} className={`${linkClass} ml-auto`}>
        Sign out
      </button>
    </nav>
  )
}
