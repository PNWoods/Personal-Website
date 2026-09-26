-- Conversation compaction (ai.pnwoods.com). Run once in the Supabase SQL editor.
--
-- When a conversation outgrows the model's context window, older messages are
-- summarized into `summary`. Messages created at or before `summary_upto` are
-- still stored (and shown in the UI) but no longer sent to the model; the
-- summary is injected into the system prompt instead.

alter table public.conversations
  add column summary text,
  add column summary_upto timestamptz,
  add column summary_message_count integer not null default 0;
