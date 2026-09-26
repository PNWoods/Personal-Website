-- Knowledge bases / RAG (ai.pnwoods.com). Run once in the Supabase SQL editor.
--
-- collections: a named knowledge base owned by a user; is_shared makes it
--   selectable by every signed-in user (accounts are hand-created and trusted).
-- documents:   one source inside a collection (uploaded file, web page, note).
-- chunks:      the text pieces that get embedded and searched.
-- match_chunks: hybrid (vector + full-text) search with reciprocal rank fusion.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- collections
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.collections enable row level security;

create policy "collections_select_own_or_shared" on public.collections
  for select to authenticated using (auth.uid() = user_id or is_shared);
create policy "collections_insert_own" on public.collections
  for insert to authenticated with check (auth.uid() = user_id);
create policy "collections_update_own" on public.collections
  for update to authenticated using (auth.uid() = user_id);
create policy "collections_delete_own" on public.collections
  for delete to authenticated using (auth.uid() = user_id);

create index collections_user_idx on public.collections (user_id);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('file', 'url', 'note')),
  source_url text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  -- notes: the note body. url/image sources: the extracted text (for re-index).
  content text,
  status text not null default 'pending'
    check (status in ('uploading', 'pending', 'extracting', 'embedding', 'ready', 'error')),
  error text,
  chunk_count integer not null default 0,
  embedded_count integer not null default 0,
  embedding_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.documents enable row level security;

-- Anyone who can see the collection can see its documents (titles/sections
-- show up as citations for shared collections). Only the owner can change them.
create policy "documents_select_own_or_shared" on public.documents
  for select to authenticated using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and (c.user_id = auth.uid() or c.is_shared)
    )
  );
create policy "documents_insert_own" on public.documents
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );
create policy "documents_update_own" on public.documents
  for update to authenticated using (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents
  for delete to authenticated using (auth.uid() = user_id);

create index documents_collection_created_idx
  on public.documents (collection_id, created_at desc);
create index documents_user_status_idx on public.documents (user_id, status);

-- ---------------------------------------------------------------------------
-- chunks
-- ---------------------------------------------------------------------------
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  -- denormalized so the vector search can filter without joining
  collection_id uuid not null references public.collections (id) on delete cascade,
  idx integer not null,
  section text,
  content text not null,
  token_count integer not null,
  embedding extensions.vector(1024),
  fts tsvector generated always as (
    to_tsvector('english'::regconfig, coalesce(section, '') || ' ' || content)
  ) stored,
  created_at timestamptz not null default now(),
  unique (document_id, idx)
);
alter table public.chunks enable row level security;

create policy "chunks_select_own_or_shared" on public.chunks
  for select to authenticated using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and (c.user_id = auth.uid() or c.is_shared)
    )
  );
create policy "chunks_write_own" on public.chunks
  for all to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create index chunks_document_idx_idx on public.chunks (document_id, idx);
create index chunks_collection_idx on public.chunks (collection_id);
create index chunks_fts_idx on public.chunks using gin (fts);
create index chunks_embedding_hnsw_idx on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops) with (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------------
-- conversations / messages
-- ---------------------------------------------------------------------------
alter table public.conversations
  add column collection_ids uuid[] not null default '{}';

-- Sources cited by an assistant turn: [{n, chunkId, documentId, title, ...}]
alter table public.messages add column sources jsonb;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_collection_updated
  before update on public.collections
  for each row execute function public.touch_updated_at();

create trigger on_document_updated
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- hybrid search
-- ---------------------------------------------------------------------------
-- Runs as definer so the ANN scan is not throttled by RLS joins; visibility is
-- enforced explicitly on the collection ids passed in. Vector and full-text
-- candidate lists are fused with reciprocal rank fusion.
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
  score double precision
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

  -- filtered HNSW scans need a wider beam to fill the candidate list
  perform set_config('hnsw.ef_search', '100', true);

  return query
  with vec as (
    select ch.id as cid, row_number() over (order by ch.dist) as rnk
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
           coalesce(1.0 / (p_rrf_k + v.rnk), 0) + coalesce(1.0 / (p_rrf_k + f.rnk), 0) as rrf
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
         fused.rrf::double precision
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
