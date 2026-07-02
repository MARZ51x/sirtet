-- MANUAL migration (documented exception to "never hand-write"):
-- the bucket row is DML and the policies target storage.objects — both are
-- outside the diffed public schema. Written once, never edited.

-- Public-read bucket: background images are decorative and read on every
-- page load — public objects get CDN caching and stable URLs. Timestamped
-- filenames (<uid>/bg-<ts>.webp) sidestep cache staleness on replacement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backgrounds', 'backgrounds', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Per-user folder policies: users manage only their own folder.
create policy "backgrounds: owner can upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "backgrounds: owner can update own objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'backgrounds'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'backgrounds'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "backgrounds: owner can delete own objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'backgrounds'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "backgrounds: owner can list own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'backgrounds'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
