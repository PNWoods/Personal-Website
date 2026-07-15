# Workout Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private, login-protected workout tracker at `/workouts` where Patrick plans workouts, logs sets (reps + weight) from an iPad, and views history.

**Architecture:** Next.js 14 App Router pages talk directly to Supabase (auth + Postgres) via `@supabase/ssr` clients; Postgres Row Level Security enforces per-user access. Middleware guards all `/workouts` routes. No custom API layer.

**Tech Stack:** Next.js 14.2, TypeScript (strict), Tailwind CSS 3, `@supabase/supabase-js`, `@supabase/ssr`.

**Spec:** `docs/superpowers/specs/2026-07-15-workout-tracker-design.md`

## Global Constraints

- Repo: `/Users/woods/Documents/GitHub/Personal-Website`. Work on branch `feature/workout-tracker`.
- No new UI libraries — Tailwind + `lucide-react` (already installed) only.
- Imports use the existing `@/*` path alias (maps to repo root).
- No test framework exists and none is added (per spec). Every task verifies via `npx tsc --noEmit`, `npm run build`, or a manual dev-server check with the exact command/URL given.
- All UI matches the site's dark aesthetic: black background (inherited from root layout), `text-white`, `border-white/10`, `bg-white/5` cards, blue accent (`bg-blue-600`).
- Touch targets ≥ 44px (`h-12` = 48px minimum; steppers `h-16`).
- The workout tracker is NOT linked from the public site navigation (`components/Navigation.tsx` is not modified).
- The root layout locks page scrolling (`overflow-hidden`); all `/workouts` pages scroll inside their own nested layout.
- Free tier only: Supabase free plan + existing Vercel hobby deploy. No paid services.
- TypeScript `lib` is `es6` — do NOT use `Array.prototype.at()`; use `arr[arr.length - 1]`.
- `.env.local` is gitignored — never commit real keys.

---

### Task 1: Supabase project setup (USER ACTION) + dependencies + env scaffolding

**Files:**
- Create: `.env.local` (gitignored, real values)
- Create: `.env.example` (committed, placeholders)
- Modify: `package.json` (via npm install)

**Interfaces:**
- Produces: env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` consumed by every later task; packages `@supabase/supabase-js` and `@supabase/ssr`.

- [ ] **Step 1: USER ACTION — create the Supabase project**

The user (not the agent — agents must not create accounts) does the following at https://supabase.com/dashboard:

1. Create a new project (free tier), e.g. named `workout-tracker`, any region near them. Save the database password somewhere safe (not needed by the app).
2. In **Authentication → Sign In / Up → Auth Providers → Email**: leave Email enabled, turn OFF "Allow new users to sign up" (this disables public signup).
3. In **Authentication → Users → Add user → Create new user**: create the account (email `patrick@rfppilot.com` or preferred email + a strong password). Check "Auto Confirm User".
4. From **Project Settings → API Keys / Data API**, copy the **Project URL** and the **anon/publishable key**.

The user pastes the URL and anon key into chat or directly into `.env.local`. Execution of Steps 2-5 can proceed before this completes, but Task 3's verification and everything after needs the real values.

- [ ] **Step 2: Create branch and install dependencies**

```bash
cd /Users/woods/Documents/GitHub/Personal-Website
git checkout -b feature/workout-tracker
npm install @supabase/supabase-js @supabase/ssr
```

Expected: both packages appear in `package.json` dependencies; install exits 0.

- [ ] **Step 3: Create env files**

Create `.env.example`:

```bash
# Supabase (workout tracker) — real values live in .env.local (gitignored)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Create `.env.local` with the same two keys, using the real values from Step 1 (or the placeholders until the user provides them).

- [ ] **Step 4: Verify build still passes**

```bash
npx tsc --noEmit && npm run build
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(workouts): add supabase dependencies and env scaffolding"
```

---

### Task 2: Database schema, RLS policies, and seed data

**Files:**
- Create: `supabase/migrations/0001_workout_schema.sql`

**Interfaces:**
- Produces: tables `profiles`, `exercises`, `workouts`, `workout_exercises`, `sets` with RLS; ~24 seeded exercises. Column names here are the source of truth for every later task.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0001_workout_schema.sql`:

```sql
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
```

- [ ] **Step 2: USER ACTION — run the migration**

The user opens the Supabase dashboard → **SQL Editor**, pastes the entire contents of `supabase/migrations/0001_workout_schema.sql`, and clicks **Run**.

Note: the user account from Task 1 Step 1 may have been created BEFORE this migration (so the trigger didn't fire). Fix by also running:

```sql
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;
```

- [ ] **Step 3: Verify schema**

In the Supabase SQL editor, run:

```sql
select count(*) from public.exercises;
```

Expected: `24`. Also confirm under **Database → Tables** that all 5 tables show "RLS enabled".

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_workout_schema.sql
git commit -m "feat(workouts): add database schema, RLS policies, and exercise seed"
```

---

### Task 3: Supabase client helpers, shared types, and auth middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/workouts/types.ts`
- Create: `middleware.ts` (repo root)

**Interfaces:**
- Consumes: env vars from Task 1.
- Produces:
  - `createClient(): SupabaseClient` from `@/lib/supabase/client` (browser) and `@/lib/supabase/server` (server components).
  - Types from `@/lib/workouts/types`: `Exercise`, `Workout`, `WorkoutExercise`, `WorkoutSet` (exact shapes below).
  - Middleware: unauthenticated requests to `/workouts/*` redirect to `/workouts/login`; authenticated requests to `/workouts/login` redirect to `/workouts`.

- [ ] **Step 1: Write the browser client**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write the server client**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Write the shared types**

Create `lib/workouts/types.ts`:

```ts
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
```

- [ ] **Step 4: Write the middleware**

Create `middleware.ts` at the repo root:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/workouts/login'

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/workouts/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/workouts'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/workouts/:path*'],
}
```

- [ ] **Step 5: Verify typecheck and redirect behavior**

```bash
npx tsc --noEmit
```

Expected: exit 0.

Start the dev server (`npm run dev`), then:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/workouts
```

Expected: `307 http://localhost:3000/workouts/login` (or 308/302 — any redirect to `/workouts/login`). Requires real Supabase env values from Task 1; if they're still placeholders, `getUser()` fails closed and the redirect still fires — verify again after real values land.

Also confirm the public site is untouched: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/home` → `200`.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts lib/workouts/types.ts middleware.ts
git commit -m "feat(workouts): add supabase clients, shared types, and auth middleware"
```

---

### Task 4: Workouts layout, nav, and login page

**Files:**
- Create: `app/workouts/layout.tsx`
- Create: `components/workouts/WorkoutsNav.tsx`
- Create: `app/workouts/login/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client`.
- Produces: scrollable layout wrapping all `/workouts` pages; nav with links to `/workouts`, `/workouts/new`, `/workouts/exercises` and a Sign out button (hidden on the login page).

- [ ] **Step 1: Write the layout**

Create `app/workouts/layout.tsx`:

```tsx
import WorkoutsNav from '@/components/workouts/WorkoutsNav'

export const metadata = {
  title: 'Workouts',
}

export default function WorkoutsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 text-white">
        <WorkoutsNav />
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the nav**

Create `components/workouts/WorkoutsNav.tsx`:

```tsx
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
```

- [ ] **Step 3: Write the login page**

Create `app/workouts/login/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/workouts')
    router.refresh()
  }

  const inputClass =
    'h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-lg text-white placeholder-white/40 outline-none focus:border-blue-500'

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="mb-6 text-center text-2xl font-bold">Workout Log</h1>
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-14 w-full rounded-xl bg-blue-600 text-lg font-semibold active:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Verify login flow in the browser**

```bash
npx tsc --noEmit
```

Expected: exit 0.

With the dev server running, open `http://localhost:3000/workouts/login` in the browser:
1. Page renders the dark-styled form; no nav bar visible.
2. Wrong password → red error message appears.
3. Correct credentials (from Task 1) → redirected to `/workouts` (404s until Task 5 — the URL change is the pass signal; after Task 5, re-verify it renders).
4. Visiting `/workouts/login` while signed in → redirected to `/workouts`.

- [ ] **Step 5: Commit**

```bash
git add app/workouts/layout.tsx components/workouts/WorkoutsNav.tsx app/workouts/login/page.tsx
git commit -m "feat(workouts): add layout, nav, and login page"
```

---

### Task 5: Dashboard page

**Files:**
- Create: `app/workouts/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `Workout` type.
- Produces: dashboard listing planned workouts (ascending by date) and last 10 completed, each linking to `/workouts/[id]`; "Plan a workout" button linking to `/workouts/new`.

- [ ] **Step 1: Write the dashboard**

Create `app/workouts/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0. In the browser (signed in), `http://localhost:3000/workouts` shows the "Plan a workout" button and both empty-state messages ("Nothing planned yet.", "No completed workouts yet."). Nav bar is visible.

- [ ] **Step 3: Commit**

```bash
git add app/workouts/page.tsx
git commit -m "feat(workouts): add dashboard page"
```

---

### Task 6: Exercise library page

**Files:**
- Create: `app/workouts/exercises/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client`; `Exercise` type.
- Produces: page listing all exercises alphabetically, an add form, and delete buttons on user-created exercises only.

- [ ] **Step 1: Write the exercises page**

Create `app/workouts/exercises/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0. In the browser at `/workouts/exercises`:
1. The 24 seeded exercises list alphabetically, none with a delete button.
2. Add "Cable Fly" → appears in alphabetical position WITH a delete button.
3. Delete "Cable Fly" → it disappears; refresh confirms it's gone.

- [ ] **Step 3: Commit**

```bash
git add app/workouts/exercises/page.tsx
git commit -m "feat(workouts): add exercise library page"
```

---

### Task 7: Plan builder

**Files:**
- Create: `app/workouts/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client`; `Exercise` type.
- Produces: page that inserts one `workouts` row + N `workout_exercises` rows, then navigates to `/workouts/{id}` (the logging page, Task 8).

- [ ] **Step 1: Write the plan builder**

Create `app/workouts/new/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0. In the browser at `/workouts/new`:
1. Add two exercises, set targets, name it "Push Day", save.
2. Browser navigates to `/workouts/<uuid>` (404 until Task 8 — the URL is the pass signal).
3. Back on `/workouts`, "Push Day" appears under Planned.

- [ ] **Step 3: Commit**

```bash
git add app/workouts/new/page.tsx
git commit -m "feat(workouts): add plan builder page"
```

---

### Task 8: Stepper, exercise logger, and live logging page

**Files:**
- Create: `components/workouts/Stepper.tsx`
- Create: `components/workouts/ExerciseLogger.tsx`
- Create: `components/workouts/CompleteWorkoutButton.tsx`
- Create: `app/workouts/[id]/page.tsx`

**Interfaces:**
- Consumes: server + browser `createClient`; `Workout`, `WorkoutExercise`, `WorkoutSet` types.
- Produces: `/workouts/[id]` logging screen. `Stepper` props: `{ label: string; value: number; step: number; min?: number; onChange: (v: number) => void }`. `ExerciseLogger` props: `{ workoutExercise: WorkoutExercise; initialSets: WorkoutSet[] }`. `CompleteWorkoutButton` props: `{ workoutId: string }`.

- [ ] **Step 1: Write the Stepper**

Create `components/workouts/Stepper.tsx`:

```tsx
'use client'

interface StepperProps {
  label: string
  value: number
  step: number
  min?: number
  onChange: (value: number) => void
}

export default function Stepper({
  label,
  value,
  step,
  min = 0,
  onChange,
}: StepperProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-white/50">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="h-16 w-16 rounded-xl border border-white/20 bg-white/5 text-3xl font-bold active:bg-white/20"
        >
          −
        </button>
        <span className="w-24 text-center text-4xl font-bold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + step)}
          className="h-16 w-16 rounded-xl border border-white/20 bg-white/5 text-3xl font-bold active:bg-white/20"
        >
          +
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the ExerciseLogger**

Create `components/workouts/ExerciseLogger.tsx`:

```tsx
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
```

- [ ] **Step 3: Write the CompleteWorkoutButton**

Create `components/workouts/CompleteWorkoutButton.tsx`:

```tsx
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
```

- [ ] **Step 4: Write the logging page**

Create `app/workouts/[id]/page.tsx`:

```tsx
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
```

- [ ] **Step 5: Verify the full loop in the browser**

```bash
npx tsc --noEmit
```

Expected: exit 0. In the browser:
1. Open the "Push Day" workout from the dashboard — exercises render in planned order with targets.
2. Steppers default to targets. Tap +/− and "Log set 1" — the set appears in the list below; refresh the page — the set persists (saved to DB immediately).
3. Log a second set — steppers keep the last set's values ("same as last set" behavior).
4. Tap "Mark workout complete" — returns to dashboard; "Push Day" now shows under Recent with a green `completed` badge.
5. Reopen the completed workout — logged sets are visible; no complete button.

- [ ] **Step 6: Commit**

```bash
git add components/workouts/Stepper.tsx components/workouts/ExerciseLogger.tsx components/workouts/CompleteWorkoutButton.tsx "app/workouts/[id]/page.tsx"
git commit -m "feat(workouts): add live logging screen with steppers"
```

---

### Task 9: Final verification, iPad viewport check, and deploy prep

**Files:**
- None created; verification + user deploy actions only.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Full build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: all exit 0 (lint warnings acceptable; errors are not).

- [ ] **Step 2: iPad viewport check**

With the dev server running, open the in-app browser at 768×1024 (iPad portrait) and 1024×768 (landscape) and walk the whole flow: login → dashboard → plan → log sets → complete. Confirm:
- No horizontal scrolling; vertical scrolling works on every page (root layout's `overflow-hidden` is escaped by the workouts layout).
- All buttons comfortably tappable (≥ 44px).
- Public pages (`/home`, `/about`, `/projects`, `/skills`) still render and scroll exactly as before.

- [ ] **Step 3: USER ACTION — Vercel env vars**

In the Vercel dashboard → project → **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview) with the values from `.env.local`.

- [ ] **Step 4: Merge and deploy**

Per the user's preference (ask before pushing — a push deploys the live site):

```bash
git checkout main
git merge --no-ff feature/workout-tracker -m "feat: add workout tracker"
git push origin main
```

- [ ] **Step 5: Verify production**

On the iPad (or any browser): visit `https://<production-domain>/workouts` → redirected to login; sign in; log a test set. Confirm the public site is unchanged.
