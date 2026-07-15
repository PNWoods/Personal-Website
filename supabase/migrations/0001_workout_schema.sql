-- Workout tracker schema. Run once in the Supabase SQL editor.

-- profiles: one row per account, auto-created on signup
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- exercises: shared library; created_by null = seeded/global (read-only)
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users (id) on delete set null
);
alter table public.exercises enable row level security;

create policy "exercises_select_authenticated" on public.exercises
  for select to authenticated using (true);
create policy "exercises_insert_own" on public.exercises
  for insert to authenticated with check (auth.uid() = created_by);
create policy "exercises_update_own" on public.exercises
  for update to authenticated using (auth.uid() = created_by);
create policy "exercises_delete_own" on public.exercises
  for delete to authenticated using (auth.uid() = created_by);

-- workouts: user_id = who it's for; created_by = who made it (multi-user hook)
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  date date not null,
  name text not null,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'completed')),
  created_at timestamptz not null default now()
);
alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts
  for select to authenticated
  using (auth.uid() = user_id or auth.uid() = created_by);
create policy "workouts_insert_creator" on public.workouts
  for insert to authenticated with check (auth.uid() = created_by);
create policy "workouts_update_own" on public.workouts
  for update to authenticated
  using (auth.uid() = user_id or auth.uid() = created_by);
create policy "workouts_delete_own" on public.workouts
  for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = created_by);

-- workout_exercises: an exercise slot in a workout, with targets
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null,
  target_sets int not null default 3,
  target_reps int not null default 10,
  target_weight numeric
);
alter table public.workout_exercises enable row level security;

create policy "workout_exercises_all_own" on public.workout_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id
        and (w.user_id = auth.uid() or w.created_by = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id
        and (w.user_id = auth.uid() or w.created_by = auth.uid())
    )
  );

-- sets: actual logged reps/weight
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number int not null,
  reps int not null,
  weight numeric not null,
  completed_at timestamptz not null default now()
);
alter table public.sets enable row level security;

create policy "sets_all_own" on public.sets
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id
        and (w.user_id = auth.uid() or w.created_by = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id
        and (w.user_id = auth.uid() or w.created_by = auth.uid())
    )
  );

-- seed the exercise library
insert into public.exercises (name) values
  ('Bench Press'), ('Incline Bench Press'), ('Overhead Press'),
  ('Dumbbell Shoulder Press'), ('Squat'), ('Front Squat'), ('Deadlift'),
  ('Romanian Deadlift'), ('Barbell Row'), ('Pull-Up'), ('Chin-Up'),
  ('Lat Pulldown'), ('Seated Cable Row'), ('Dumbbell Curl'), ('Barbell Curl'),
  ('Tricep Pushdown'), ('Skull Crusher'), ('Leg Press'), ('Leg Curl'),
  ('Leg Extension'), ('Calf Raise'), ('Lateral Raise'), ('Face Pull'),
  ('Hip Thrust');
