-- streaming_contents has been deliberately deferred since early in this
-- engagement: it's the single highest-traffic table (uploads, live status,
-- viewer counts, likes, moderation, collaborative edits) and locking it
-- down without first enumerating every legitimate writer risked breaking
-- core streaming functionality. That audit is now done.
--
-- The audit surfaced a real, separate bug along the way: every actual
-- content-creation call site in the app (GoLiveButton.jsx,
-- ContentUploadModal.jsx, DirectUploadModal.jsx, StreamScheduler.jsx,
-- CreatePPVStreamModal.jsx, ClipCreator.jsx, and others) sets
-- `creator_email`, never `created_by` -- but most of the "my content"
-- read paths (ContentLibrary.jsx, ContentDashboard.jsx,
-- ContentAnalytics.jsx, CreatorContentSuggestions.jsx,
-- LivestreamManager.jsx's "my live streams", SharedLibraryManager.jsx,
-- ContentEditWorkflow.jsx) filter by `created_by`, and
-- LivestreamViewer.jsx's isStreamCreator check (which gates the End
-- Stream / Co-Host / Join-Requests host controls) checks `created_by`
-- too. Since `created_by` was never actually populated, all of those have
-- always come back empty/false for real content -- creators could never
-- see their own uploads in these views, and a live stream's real host
-- could never see their own host controls while watching their own
-- stream. It also means 0046's content_edits reviewer check
-- (sc.created_by = auth.email()) has never actually matched a real
-- reviewer either, since the content it's checking against never has
-- created_by set.
--
-- Fixing every read call site individually would mean touching 7+
-- frontend files; keeping the two columns in sync at the database level
-- fixes all of them at once, including the ones only discoverable by
-- reading component internals, and fixes the 0046 bug retroactively too.
update public.streaming_contents set created_by = creator_email where created_by is null and creator_email is not null;
update public.streaming_contents set creator_email = created_by where creator_email is null and created_by is not null;

create or replace function public.sync_streaming_content_owner() returns trigger
language plpgsql
as $$
begin
  if NEW.created_by is null and NEW.creator_email is not null then
    NEW.created_by := NEW.creator_email;
  elsif NEW.creator_email is null and NEW.created_by is not null then
    NEW.creator_email := NEW.created_by;
  end if;
  return NEW;
end;
$$;

drop trigger if exists sync_streaming_content_owner_trg on public.streaming_contents;
create trigger sync_streaming_content_owner_trg
before insert or update on public.streaming_contents
for each row execute function public.sync_streaming_content_owner();

-- Now that ownership is reliable, lock down writes: the real
-- creator/uploader (checked via either column, in case any legacy row
-- only ever had one of them) or admin may create/delete their own
-- content. UPDATE stays row-permissive -- watching/liking someone else's
-- content is a real, any-viewer action (VODPlayer.jsx, LivestreamViewer.jsx)
-- -- and is protected at the column level below instead, the same shape
-- already used for reels/events/user_galleries.
drop policy if exists "streaming_contents_write_authenticated" on public.streaming_contents;

create policy "streaming_contents_insert_own" on public.streaming_contents
  for insert to authenticated
  with check (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()));

create policy "streaming_contents_update_authenticated" on public.streaming_contents
  for update to authenticated using (true) with check (true);

create policy "streaming_contents_delete_own" on public.streaming_contents
  for delete to authenticated
  using (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()));

-- Column-level protection for the genuine any-viewer actions: watching a
-- VOD/livestream bumps `views` (VODPlayer.jsx, LivestreamViewer.jsx), and
-- liking bumps `liked_by`/`likes_count` -- neither requires owning the
-- content. Everything else (title, video_url, is_live, pricing, status,
-- moderation) stays owner/admin-only.
create or replace function public.protect_streaming_content_ownership() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email())
     and auth.email() is distinct from OLD.created_by and auth.email() is distinct from OLD.creator_email then
    NEW.created_by := OLD.created_by;
    NEW.creator_email := OLD.creator_email;
    NEW.creator_username := OLD.creator_username;
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.video_url := OLD.video_url;
    NEW.thumbnail_url := OLD.thumbnail_url;
    NEW.type := OLD.type;
    NEW.content_type := OLD.content_type;
    NEW.category := OLD.category;
    NEW.is_live := OLD.is_live;
    NEW.status := OLD.status;
    NEW.visibility := OLD.visibility;
    NEW.is_monetized := OLD.is_monetized;
    NEW.price_usd := OLD.price_usd;
    NEW.rental_price_usd := OLD.rental_price_usd;
    NEW.requires_subscription := OLD.requires_subscription;
    NEW.betting_available := OLD.betting_available;
    NEW.agora_channel_name := OLD.agora_channel_name;
    NEW.stream_started_at := OLD.stream_started_at;
    NEW.stream_ended_at := OLD.stream_ended_at;
    NEW.tags := OLD.tags;
    NEW.rating := OLD.rating;
    NEW.duration := OLD.duration;
    NEW.chapters := OLD.chapters;
    NEW.clip_start_time := OLD.clip_start_time;
    NEW.clip_end_time := OLD.clip_end_time;
    NEW.vod_trim_end := OLD.vod_trim_end;
    NEW.source_stream_id := OLD.source_stream_id;
    NEW.source_type := OLD.source_type;
    -- views, liked_by, likes_count are intentionally left writable by any
    -- authenticated viewer.
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_streaming_content_ownership_trg on public.streaming_contents;
create trigger protect_streaming_content_ownership_trg
before update on public.streaming_contents
for each row execute function public.protect_streaming_content_ownership();

-- Fixes the same "created_by never populated" bug in 0046's content_edits
-- reviewer check, which relied on it -- widen to accept either column.
drop policy if exists "content_edits_update_own" on public.content_edits;
create policy "content_edits_update_own" on public.content_edits
  for update to authenticated
  using (
    auth.email() = editor_email
    or exists (
      select 1 from public.streaming_contents sc
      where sc.id = content_edits.content_id
        and (sc.created_by = auth.email() or sc.creator_email = auth.email())
    )
  )
  with check (
    auth.email() = editor_email
    or exists (
      select 1 from public.streaming_contents sc
      where sc.id = content_edits.content_id
        and (sc.created_by = auth.email() or sc.creator_email = auth.email())
    )
  );

create or replace function public.protect_content_edit_review() returns trigger
language plpgsql
as $$
declare
  v_is_reviewer boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    select exists (
      select 1 from public.streaming_contents sc
      where sc.id = NEW.content_id
        and (sc.created_by = auth.email() or sc.creator_email = auth.email())
    ) into v_is_reviewer;

    if not v_is_reviewer then
      NEW.status := OLD.status;
      NEW.reviewed_by := OLD.reviewed_by;
    end if;
  end if;
  return NEW;
end;
$$;
