'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Exercise } from '@/lib/workouts/types'

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      const { data } = await supabase.from('exercises').select('*').order('name')
      setExercises((data as Exercise[]) ?? [])
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addExercise(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name || !userId) return
    setError(null)
    const { data, error } = await supabase
      .from('exercises')
      .insert({ name, created_by: userId })
      .select()
      .single()
    if (error || !data) {
      setError(error?.message ?? 'Failed to add exercise')
      return
    }
    setExercises(
      [...exercises, data as Exercise].sort((a, b) => a.name.localeCompare(b.name))
    )
    setNewName('')
  }

  async function deleteExercise(id: string) {
    setError(null)
    const { error } = await supabase.from('exercises').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setExercises(exercises.filter((ex) => ex.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exercise Library</h1>

      <form onSubmit={addExercise} className="flex gap-3">
        <input
          type="text"
          placeholder="New exercise name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-lg text-white placeholder-white/40 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="h-14 shrink-0 rounded-xl bg-blue-600 px-6 text-lg font-semibold active:bg-blue-500"
        >
          Add
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ul className="space-y-2">
        {exercises.map((ex) => (
          <li
            key={ex.id}
            className="flex min-h-[56px] items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
          >
            <span className="text-lg">{ex.name}</span>
            {ex.created_by === userId && userId !== null && (
              <button
                type="button"
                onClick={() => deleteExercise(ex.id)}
                aria-label={`Delete ${ex.name}`}
                className="flex h-12 w-12 items-center justify-center rounded-lg text-white/40 active:bg-white/10 active:text-red-400"
              >
                <Trash2 size={20} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
