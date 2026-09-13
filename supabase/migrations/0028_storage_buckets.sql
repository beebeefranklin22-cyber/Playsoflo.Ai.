-- src/api/integrations.js's UploadFile() -- used for every photo, video,
-- and file upload across the whole app (social posts, stories, listings,
-- thumbnails, chat attachments, etc.) -- always targets a single bucket
-- named "media" and calls getPublicUrl() on the result. That bucket was
-- never created on this Supabase project, so every upload attempt failed
-- with "Bucket not found."
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Public read: getPublicUrl() only works if anyone (including signed-out
-- visitors) can view the object -- this is how uploaded photos/videos
-- render at all anywhere in the app.
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
for select using (bucket_id = 'media');

-- Any signed-in user can upload. Filenames are randomized
-- (`${timestamp}-${random}.${ext}`) with no per-user folder structure, so
-- there's no ownership boundary to check at upload time -- this matches
-- how the app actually generates paths.
drop policy if exists "media_authenticated_insert" on storage.objects;
create policy "media_authenticated_insert" on storage.objects
for insert to authenticated with check (bucket_id = 'media');

-- Supabase Storage automatically stamps every uploaded object's `owner`
-- column with the uploader's auth.uid() -- use that (not the unpredictable
-- filename) to make sure only the person who uploaded a file can overwrite
-- or delete it, not just any other signed-in user.
drop policy if exists "media_owner_update" on storage.objects;
create policy "media_owner_update" on storage.objects
for update to authenticated using (bucket_id = 'media' and auth.uid() = owner);

drop policy if exists "media_owner_delete" on storage.objects;
create policy "media_owner_delete" on storage.objects
for delete to authenticated using (bucket_id = 'media' and auth.uid() = owner);
