-- Knowledge relevance gate + automatic collection selection (ai.pnwoods.com).
-- Run once in the Supabase SQL editor.
--
-- match_chunks now also returns the raw cosine similarity of the vector hit
-- and whether full-text search matched, so the server can drop excerpts that
-- are not actually relevant to the question ("testing" no longer pulls in
-- eight random chunks). conversations.knowledge_auto searches every
-- collection the user can see and lets that gate decide per message.

alter table public.conversations
  add column knowledge_auto boolean not null default false;

-- Return type changes, so the old function must go first.
drop function if exists public.match_chunks(extensions.vector, text, uuid[], int, int, int);

create or replace function public.match_chunks(
  p_query_embedding extensions.vector(1024),
  p_query_text text,
  p_collection_ids uuid[],
  p_match_count int default 24,
  p_candidates int default 40,
  p_rrf_k int default 60
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  source_type text,
  source_url text,
  section text,
  content text,
  token_count int,
  score double precision,
  similarity double precision,
  fts_hit boolean
)
language plpgsql
security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  allowed uuid[];
begin
  select array_agg(c.id) into allowed
  from public.collections c
  where c.id = any(p_collection_ids)
    and (c.user_id = auth.uid() or c.is_shared);
  if allowed is null then
    return;
  end if;

  perform set_config('hnsw.ef_search', '100', true);

  return query
  with vec as (
    select ch.id as cid, ch.dist, row_number() over (order by ch.dist) as rnk
    from (
      select c.id, c.embedding operator(extensions.<=>) p_query_embedding as dist
      from public.chunks c
      where c.collection_id = any(allowed) and c.embedding is not null
      order by dist
      limit p_candidates
    ) ch
  ),
  fts as (
    select ch.id as cid, row_number() over (order by ch.r desc) as rnk
    from (
      select c.id, ts_rank_cd(c.fts, q.query) as r
      from public.chunks c
      cross join (select websearch_to_tsquery('english', p_query_text) as query) q
      where p_query_text <> ''
        and c.collection_id = any(allowed)
        and c.fts @@ q.query
      order by r desc
      limit p_candidates
    ) ch
  ),
  fused as (
    select coalesce(v.cid, f.cid) as cid,
           coalesce(1.0 / (p_rrf_k + v.rnk), 0) + coalesce(1.0 / (p_rrf_k + f.rnk), 0) as rrf,
           v.dist,
           (f.cid is not null) as fts_hit
    from vec v
    full outer join fts f on v.cid = f.cid
  )
  select ch.id,
         ch.document_id,
         d.title,
         d.source_type,
         d.source_url,
         ch.section,
         ch.content,
         ch.token_count,
         fused.rrf::double precision,
         -- cosine similarity of the vector hit; recomputed for fts-only rows
         coalesce(1 - fused.dist,
                  1 - (ch.embedding operator(extensions.<=>) p_query_embedding))::double precision,
         fused.fts_hit
  from fused
  join public.chunks ch on ch.id = fused.cid
  join public.documents d on d.id = ch.document_id
  where d.status = 'ready'
  order by fused.rrf desc, ch.document_id, ch.idx
  limit p_match_count;
end;
$$;

revoke all on function public.match_chunks(extensions.vector, text, uuid[], int, int, int) from public;
revoke all on function public.match_chunks(extensions.vector, text, uuid[], int, int, int) from anon;
grant execute on function public.match_chunks(extensions.vector, text, uuid[], int, int, int) to authenticated;
