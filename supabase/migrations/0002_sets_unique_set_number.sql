-- Make set logging idempotent: one row per (workout_exercise, set_number)
alter table public.sets
  add constraint sets_workout_exercise_set_number_key
  unique (workout_exercise_id, set_number);
