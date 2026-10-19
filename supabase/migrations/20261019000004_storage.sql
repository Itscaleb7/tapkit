-- Storage buckets.
-- voice-notes: PRIVATE. Path: {user_id}/{uuid}.m4a
-- portfolio-media: PUBLIC read (only for images the user explicitly uploads for their portfolio). Path: {user_id}/{file}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('voice-notes', 'voice-notes', false, 26214400, array['audio/m4a','audio/x-m4a','audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/webm']),
  ('portfolio-media', 'portfolio-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy voice_notes_select on storage.objects for select to authenticated
  using (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy voice_notes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy voice_notes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy portfolio_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy portfolio_media_update on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy portfolio_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy portfolio_media_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
