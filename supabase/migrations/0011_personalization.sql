-- Personalization (ai.pnwoods.com). Run once in the Supabase SQL editor.
--
-- Free-text instructions the user writes about how replies should look
-- (tables vs. bullets, length, language, tone). Injected into every system
-- prompt right after the base instructions. Edited on Settings → Personalization.

alter table public.user_settings
  add column custom_instructions text not null default ''
    check (char_length(custom_instructions) <= 2000);
