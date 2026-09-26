-- Per-user memory (ai.pnwoods.com). Run once in the Supabase SQL editor.
--
-- Short durable facts about a user (role, preferences, projects, setup) that
-- are injected into every system prompt. Rows are added automatically after
-- replies (when user_settings.memory_auto is on), by "remember that ..."
-- messages, or by hand on the Settings page.

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  kind text not null default 'auto' check (kind in ('auto', 'manual')),
  source_conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.memories enable row level security;

create policy "memories_select_own" on public.memories
  for select to authenticated using (auth.uid() = user_id);
create policy "memories_insert_own" on public.memories
  for insert to authenticated with check (auth.uid() = user_id);
create policy "memories_update_own" on public.memories
  for update to authenticated using (auth.uid() = user_id);
create policy "memories_delete_own" on public.memories
  for delete to authenticated using (auth.uid() = user_id);

create index memories_user_created_idx on public.memories (user_id, created_at desc);

create trigger on_memory_updated
  before update on public.memories
  for each row execute function public.touch_updated_at();

-- Opt out of automatic extraction per user.
alter table public.user_settings
  add column memory_auto boolean not null default true;
