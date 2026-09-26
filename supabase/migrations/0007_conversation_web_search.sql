-- On-demand web search per conversation (ai.pnwoods.com). Run once in the Supabase SQL editor.
--
-- When web_search is on, each message also runs a Brave Search query and the
-- top results are fetched and cited alongside knowledge-base excerpts.
-- Nothing from the web is stored unless the user saves a page to a collection.

alter table public.conversations
  add column web_search boolean not null default false;
