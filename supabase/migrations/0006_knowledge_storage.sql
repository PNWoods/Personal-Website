-- Knowledge base file storage (ai.pnwoods.com). Run once in the Supabase SQL editor.
--
-- Private bucket for uploaded documents. Objects live at
--   <user_id>/<document_id>/<filename>
-- and only the owner can read or write their folder. Other users of a shared
-- collection see chunks and titles through the tables, never the original file.

insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge', 'knowledge', false, 52428800) -- 50 MB per file
on conflict (id) do nothing;

create policy "knowledge_objects_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'knowledge' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "knowledge_objects_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'knowledge' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "knowledge_objects_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'knowledge' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "knowledge_objects_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'knowledge' and (storage.foldername(name))[1] = auth.uid()::text);
