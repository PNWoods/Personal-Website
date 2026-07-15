'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Stepper from '@/components/workouts/Stepper'
import type { WorkoutExercise, WorkoutSet } from '@/lib/workouts/types'

interface Props {
  workoutExercise: WorkoutExercise
  initialSets: WorkoutSet[]
}

export default function ExerciseLogger({ workoutExercise, initialSets }: Props) {
  const we = workoutExercise
  const last = initialSets[initialSets.length - 1]
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets)
  const [reps, setReps] = useState(last ? last.reps : we.target_reps)
  const [weight, setWeight] = useState(
    Number(last ? last.weight : we.target_weight ?? 45)
  )
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  async function logSet() {
    setSaving(true)
    setFailed(false)
    const { data, error } = await createClient()
      .from('sets')
      .insert({
        workout_exercise_id: we.id,
        set_number: sets.length + 1,
        reps,
        weight,
      })
      .select()
      .single()
    setSaving(false)
    if (error || !data) {
      setFailed(true)
      return
    }
    setSets([...sets, data as WorkoutSet])
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-xl font-semibold">{we.exercise?.name ?? 'Exercise'}</div>
      <div className="mb-5 text-sm text-white/50">
        Target: {we.target_sets} × {we.target_reps}
        {we.target_weight != null ? ` @ ${Number(we.target_weight)} lb` : ''}
      </div>

      <div className="flex flex-wrap items-end justify-center gap-8">
        <Stepper label="Reps" value={reps} step={1} min={1} onChange={setReps} />
        <Stepper
          label="Weight (lb)"
          value={weight}
          step={5}
          min={0}
          onChange={setWeight}
        />
      </div>

      <button
        type="button"
        onClick={logSet}
        disabled={saving}
        className="mt-6 h-14 w-full rounded-xl bg-blue-600 text-lg font-semibold active:bg-blue-500 disabled:opacity-50"
      >
        {saving ? 'Saving…' : `Log set ${sets.length + 1}`}
      </button>

      {failed && (
        <button
          type="button"
          onClick={logSet}
          className="mt-2 h-12 w-full rounded-xl border border-red-500/50 text-base text-red-400 active:bg-red-500/10"
        >
          Save failed — tap to retry
        </button>
      )}

      {sets.length > 0 && (
        <ul className="mt-5 space-y-1 border-t border-white/10 pt-4">
          {sets.map((s) => (
            <li
              key={s.id}
              className="flex justify-between text-sm text-white/70"
            >
              <span>Set {s.set_number}</span>
              <span className="tabular-nums">
                {s.reps} reps @ {Number(s.weight)} lb
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
