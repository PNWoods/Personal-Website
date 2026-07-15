'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Exercise } from '@/lib/workouts/types'

interface PlanRow {
  exerciseId: string
  targetSets: number
  targetReps: number
  targetWeight: number | ''
}

export default function NewWorkoutPage() {
  const router = useRouter()
  const supabase = createClient()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [name, setName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<PlanRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('exercises')
      .select('*')
      .order('name')
      .then(({ data }) => setExercises((data as Exercise[]) ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addRow() {
    if (exercises.length === 0) return
    setRows([
      ...rows,
      { exerciseId: exercises[0].id, targetSets: 3, targetReps: 10, targetWeight: '' },
    ])
  }

  function updateRow(i: number, patch: Partial<PlanRow>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function removeRow(i: number) {
    setRows(rows.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (!name.trim() || rows.length === 0) {
      setError('Add a workout name and at least one exercise.')
      return
    }
    setSaving(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/workouts/login')
      return
    }

    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, created_by: user.id, date, name: name.trim() })
      .select()
      .single()
    if (wErr || !workout) {
      setError(wErr?.message ?? 'Failed to save workout')
      setSaving(false)
      return
    }

    const { error: weErr } = await supabase.from('workout_exercises').insert(
      rows.map((r, i) => ({
        workout_id: workout.id,
        exercise_id: r.exerciseId,
        position: i,
        target_sets: r.targetSets,
        target_reps: r.targetReps,
        target_weight: r.targetWeight === '' ? null : r.targetWeight,
      }))
    )
    if (weErr) {
      setError(weErr.message)
      setSaving(false)
      return
    }

    router.push(`/workouts/${workout.id}`)
  }

  const inputClass =
    'h-14 rounded-xl border border-white/15 bg-white/5 px-4 text-lg text-white placeholder-white/40 outline-none focus:border-blue-500'
  const numClass = `${inputClass} w-full text-center`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Plan a Workout</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Workout name (e.g. Push Day)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClass} w-full`}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputClass} sm:w-48`}
        />
      </div>

      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2">
              <select
                value={row.exerciseId}
                onChange={(e) => updateRow(i, { exerciseId: e.target.value })}
                className={`${inputClass} w-full appearance-none`}
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-black">
                    {ex.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove exercise"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white/40 active:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">
                  Sets
                </span>
                <input
                  type="number"
                  min={1}
                  value={row.targetSets}
                  onChange={(e) =>
                    updateRow(i, { targetSets: Number(e.target.value) })
                  }
                  className={numClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">
                  Reps
                </span>
                <input
                  type="number"
                  min={1}
                  value={row.targetReps}
                  onChange={(e) =>
                    updateRow(i, { targetReps: Number(e.target.value) })
                  }
                  className={numClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">
                  Weight (lb)
                </span>
                <input
                  type="number"
                  min={0}
                  step={2.5}
                  placeholder="—"
                  value={row.targetWeight}
                  onChange={(e) =>
                    updateRow(i, {
                      targetWeight:
                        e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  className={numClass}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="h-14 w-full rounded-xl border border-dashed border-white/25 text-lg text-white/70 active:bg-white/10"
      >
        + Add exercise
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="h-14 w-full rounded-xl bg-blue-600 text-lg font-semibold active:bg-blue-500 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save workout'}
      </button>
    </div>
  )
}
