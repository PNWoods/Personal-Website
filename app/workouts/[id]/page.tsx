import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExerciseLogger from '@/components/workouts/ExerciseLogger'
import CompleteWorkoutButton from '@/components/workouts/CompleteWorkoutButton'
import type { Workout, WorkoutExercise } from '@/lib/workouts/types'

export const dynamic = 'force-dynamic'

export default async function WorkoutPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: workout } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', params.id)
    .single()
  if (!workout) notFound()
  const w = workout as Workout

  const { data: workoutExercises } = await supabase
    .from('workout_exercises')
    .select('*, exercise:exercises(*), sets(*)')
    .eq('workout_id', params.id)
    .order('position')
  const items = (workoutExercises as WorkoutExercise[]) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{w.name}</h1>
        <p className="text-white/50">
          {w.date} · {w.status}
        </p>
      </div>

      {items.map((we) => (
        <ExerciseLogger
          key={we.id}
          workoutExercise={we}
          initialSets={(we.sets ?? [])
            .slice()
            .sort((a, b) => a.set_number - b.set_number)}
        />
      ))}

      {w.status === 'planned' && <CompleteWorkoutButton workoutId={w.id} />}
    </div>
  )
}
