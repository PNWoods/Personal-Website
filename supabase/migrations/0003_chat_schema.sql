-- AI chat schema (ai.pnwoods.com). Run once in the Supabase SQL editor.

-- conversations: one per chat thread, owned by a user
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create policy "conversations_select_own" on public.conversations
  for select to authenticated using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations
  for insert to authenticated with check (auth.uid() = user_id);
create policy "conversations_update_own" on public.conversations
  for update to authenticated using (auth.uid() = user_id);
create policy "conversations_delete_own" on public.conversations
  for delete to authenticated using (auth.uid() = user_id);

create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- messages: ordered turns within a conversation
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

create policy "messages_all_own" on public.messages
  for all to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- keep conversations ordered by most recent activity
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.touch_conversation();
