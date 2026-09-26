-- Per-user chat settings (ai.pnwoods.com). Run once in the Supabase SQL editor.
--
-- One row per user, created on first save. bubble_color is one of the
-- skills-page palette names (see lib/ai/theme.ts).

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bubble_color text not null default 'blue'
    check (bubble_color in ('blue', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow', 'red', 'gray')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select to authenticated using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated using (auth.uid() = user_id);
create policy "user_settings_delete_own" on public.user_settings
  for delete to authenticated using (auth.uid() = user_id);

create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute function public.touch_updated_at();
