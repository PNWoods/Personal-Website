export interface Exercise {
  id: string
  name: string
  created_by: string | null
}

export interface Workout {
  id: string
  user_id: string
  created_by: string
  date: string
  name: string
  notes: string | null
  status: 'planned' | 'completed'
  created_at: string
}

export interface WorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  reps: number
  weight: number
  completed_at: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  position: number
  target_sets: number
  target_reps: number
  target_weight: number | null
  exercise?: Exercise
  sets?: WorkoutSet[]
}
