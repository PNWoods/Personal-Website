-- Self-service sign-up behind an invite code (ai.pnwoods.com).
-- Run once in the Supabase SQL editor, then CHANGE THE CODE (last statement).
--
-- Supabase's own "Allow new users to sign up" switch is all-or-nothing, and
-- the anon key ships in the browser bundle, so the only gate that cannot be
-- bypassed is a trigger on auth.users. The sign-up form sends the code as
-- user metadata; this trigger compares it with app_config and rejects the
-- insert on mismatch (the API then reports "Database error saving new user",
-- which the login page shows as "Invalid invite code").
--
-- Clear the value ('') to open sign-up to anyone. The trigger also runs for
-- users created in the dashboard, so clear the code before adding one there.

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
-- No policies on purpose: only the security-definer function below reads it.
revoke all on public.app_config from anon, authenticated;

create or replace function public.enforce_signup_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  required text;
  supplied text;
begin
  select value into required from public.app_config where key = 'signup_invite_code';
  if required is null or required = '' then
    return new;
  end if;
  supplied := coalesce(new.raw_user_meta_data ->> 'invite_code', '');
  if supplied <> required then
    raise exception 'Invalid invite code';
  end if;
  -- Do not keep the code in the stored profile.
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end;
$$;

drop trigger if exists on_auth_user_signup_invite on auth.users;
create trigger on_auth_user_signup_invite
  before insert on auth.users
  for each row execute function public.enforce_signup_invite();

-- >>> Change this value before sharing the link. <<<
insert into public.app_config (key, value)
  values ('signup_invite_code', 'CHANGE-ME')
  on conflict (key) do nothing;
