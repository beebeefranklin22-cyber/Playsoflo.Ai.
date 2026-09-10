-- Fixes for social hub interactions found by tracing actual usage:
-- liking someone else's reel/event/gallery photo updates THEIR row, but
-- 0001 gave these tables an owner-only update policy (it picked the
-- single obvious owner column without knowing some writes come from a
-- different, uninvolved user). social_posts/comments/streaming_contents
-- already got the correct permissive treatment — these three didn't.
drop policy if exists "reels_update_own" on public.reels;
drop policy if exists "reels_write_authenticated" on public.reels;
create policy "reels_write_authenticated" on public.reels
  for update to authenticated using (true) with check (true);

drop policy if exists "user_galleries_update_own" on public.user_galleries;
drop policy if exists "user_galleries_write_authenticated" on public.user_galleries;
create policy "user_galleries_write_authenticated" on public.user_galleries
  for update to authenticated using (true) with check (true);

drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_write_authenticated" on public.events;
create policy "events_write_authenticated" on public.events
  for update to authenticated using (true) with check (true);

-- chat_conversations: only the creator could update it (e.g. bump
-- last_message), but a 1:1 conversation has two participants and either
-- one needs to update it when they send a message. Scope to "you're a
-- participant" instead of "you created it".
drop policy if exists "chat_conversations_update_own" on public.chat_conversations;
drop policy if exists "chat_conversations_update_participant" on public.chat_conversations;
create policy "chat_conversations_update_participant" on public.chat_conversations
  for update to authenticated
  using (auth.email() = created_by or participants @> to_jsonb(auth.email()))
  with check (auth.email() = created_by or participants @> to_jsonb(auth.email()));

-- Tagging people in a post: reels already save `tags`, but social_posts
-- never got a column for it at all, so CreateContentModal's tag tool
-- silently had nowhere to write for regular posts.
alter table public.social_posts add column if not exists tags jsonb;

-- Real, persisted "save/bookmark a post" — src/components/feed/
-- FullScreenFeed.jsx tracked this in local React state only, so it reset
-- on every reload despite showing a success toast. user_interactions
-- (0005: user_email, interaction_type, target_id) already has everything
-- needed to record interaction_type = 'save', no new column required.
