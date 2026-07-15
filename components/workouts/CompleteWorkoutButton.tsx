'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CompleteWorkoutButton({
  workoutId,
}: {
  workoutId: string
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function complete() {
    setSaving(true)
    setError(null)
    const { error } = await createClient()
      .from('workouts')
      .update({ status: 'completed' })
      .eq('id', workoutId)
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    router.push('/workouts')
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={complete}
        disabled={saving}
        className="h-14 w-full rounded-xl border border-green-500/50 text-lg font-semibold text-green-400 active:bg-green-500/10 disabled:opacity-50"
      >
        {saving ? 'Finishing…' : 'Mark workout complete'}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
