# Workout Tracker — Design

**Date:** 2026-07-15
**Status:** Approved (design), pending implementation plan

## Purpose

Add a private workout tracker to the personal website (Next.js 14 on Vercel, Cloudflare DNS) so Patrick can plan workouts, log them at the gym from an iPad (reps + weight per set), and review history. Must stay on free tiers. Multi-user comes later (e.g. someone else assigns Patrick a workout), but the schema supports it from day one.

## Decisions made during brainstorming

- **Repo:** `Personal-Website` (Next.js 14 App Router, Tailwind, TypeScript). Not the static `PNWoods.github.io` site.
- **Hosting:** Existing Vercel deploy; no new infrastructure.
- **Backend:** Supabase free tier — auth (email/password) + Postgres in one service.
- **Data access:** Supabase JS client directly from the app with Row Level Security (RLS) policies enforcing per-user access. No custom API layer (Approach A). Session handling via `@supabase/ssr` middleware.
- **Logging model:** Planned workouts + logging — build a plan (exercises with target sets/reps/weight), then check off and record actuals set-by-set.
- **Placement:** Hidden route at `/workouts` — not linked in public navigation; bookmark it on the iPad.
- **Exercises:** Editable library seeded with ~20 common lifts; user can add more. Consistent names keep per-exercise history clean.
- **Signups:** Public signup disabled in Supabase. Patrick's account created manually. Future users are added manually too.

## v1 Scope

Single account (Patrick) can:

1. Log in at `/workouts/login`; all other `/workouts` routes redirect to login when unauthenticated.
2. Build a planned workout for a date: pick exercises from the library, set target sets/reps/weight, order them.
3. Log the workout live: per exercise, record each set's actual reps and weight with large +/− steppers; mark workout complete.
4. View dashboard: today's/upcoming planned workouts and recent completed ones.
5. Manage the exercise library.

Out of scope for v1 (but schema-ready): second user accounts, roles/permissions UI, coach-assigns-workout flow, progress charts.

## Routes

| Route | Purpose |
|---|---|
| `/workouts/login` | Email + password login, styled to match the site |
| `/workouts` | Dashboard: planned + recent workouts, "Plan workout" button |
| `/workouts/new` | Plan builder |
| `/workouts/[id]` | Live logging screen |
| `/workouts/exercises` | Exercise library management |

Middleware protects everything under `/workouts` except `/workouts/login`.

## Data model (Supabase Postgres, RLS on every table)

- `profiles` — `id` (FK → `auth.users`), `display_name`. One row per account.
- `exercises` — `id`, `name`, `created_by` (nullable; null = seeded/global row).
- `workouts` — `id`, `user_id` (who the workout is for), `created_by` (who made it — the multi-user hook), `date`, `name`, `notes`, `status` (`planned` | `completed`).
- `workout_exercises` — `id`, `workout_id`, `exercise_id`, `position`, `target_sets`, `target_reps`, `target_weight`.
- `sets` — `id`, `workout_exercise_id`, `set_number`, `reps`, `weight`, `completed_at`.

RLS policies: a user can read/write workouts where they are `user_id` or `created_by`; exercises readable by all authenticated users, writable by their creator; seeded exercises read-only.

## UI

- Matches the existing dark aesthetic (black background, grid pattern, Inter font, Tailwind).
- The workout routes get their own nested layout with a scrollable container — the root layout locks page scrolling (`overflow-hidden`), so `/workouts` pages manage their own scroll.
- iPad-first: touch targets ≥ 44px, oversized +/− steppers for reps and weight, one-tap "same as last set", no typing required mid-workout.

## Error handling

- Sets save individually and immediately (never lose more than one set to a dropped connection).
- Optimistic UI with visible retry state on failed saves.
- Auth/session errors redirect to `/workouts/login`.

## Testing / verification

- Manual verification via `next dev` and iPad-sized viewport (browser preview at 768×1024 and on-device).
- No test framework exists in this repo; not adding one in v1.

## Cost

$0 — Supabase free tier (500MB database) + existing Vercel hobby deploy.
