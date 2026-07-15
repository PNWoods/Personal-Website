import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Workout } from '@/lib/workouts/types'

export const dynamic = 'force-dynamic'

function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Link
      href={`/workouts/${workout.id}`}
      className="flex min-h-[64px] items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 active:bg-white/10"
    >
      <div>
        <div className="text-lg font-semibold">{workout.name}</div>
        <div className="text-sm text-white/50">{workout.date}</div>
      </div>
      <span
        className={
          workout.status === 'completed'
            ? 'text-sm text-green-400'
            : 'text-sm text-blue-400'
        }
      >
        {workout.status}
      </span>
    </Link>
  )
}

export default async function WorkoutsDashboard() {
  const supabase = createClient()

  const { data: planned } = await supabase
    .from('workouts')
    .select('*')
    .eq('status', 'planned')
    .order('date', { ascending: true })

  const { data: completed } = await supabase
    .from('workouts')
    .select('*')
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      <Link
        href="/workouts/new"
        className="flex h-14 items-center justify-center rounded-xl bg-blue-600 text-lg font-semibold active:bg-blue-500"
      >
        Plan a workout
      </Link>

      <section>
        <h2 className="mb-3 text-xl font-bold">Planned</h2>
        {planned && planned.length > 0 ? (
          <div className="space-y-3">
            {(planned as Workout[]).map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        ) : (
          <p className="text-white/50">Nothing planned yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Recent</h2>
        {completed && completed.length > 0 ? (
          <div className="space-y-3">
            {(completed as Workout[]).map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        ) : (
          <p className="text-white/50">No completed workouts yet.</p>
        )}
      </section>
    </div>
  )
}
