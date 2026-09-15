-- An earlier migration in this engagement identified that reels, events,
-- livestream_chats, co_stream_participants, qa_questions, user_galleries,
-- and ad_campaigns each have a real feature where someone OTHER than the
-- row's owner legitimately needs to update it (liking someone else's
-- reel, the host pinning a viewer's chat message, upvoting someone else's
-- question, logging an ad impression), and deliberately left the whole
-- row open for update rather than build column-level protection, "relying
-- on the UI gate for now". This migration builds that protection for real,
-- using the same BEFORE UPDATE trigger pattern already used throughout
-- this series (protect_lease_signatures, protect_review_moderation, etc):
-- keep the row visible/writable to the right set of people, but pin the
-- non-engagement columns back to their old value unless the real owner
-- (or a stream's real host, or admin) is the one writing.

-- qa_questions was missing its own question-text column entirely --
-- LivestreamQA.jsx has always sent {question, stream_id, user_email,
-- user_name, upvotes, status} on create, but "question" was never a
-- column, so asking a question in a live Q&A has always failed outright.
alter table public.qa_questions add column if not exists question text;

-- co_stream_participants_write_own (0050) scoped writes to
-- participant_email/invited_by/admin, but a HOST approving a viewer's
-- unsolicited join request (JoinRequestsPanel.jsx) is neither of those on
-- the row as it existed before the approval -- widen to also recognize the
-- stream's real host via stream_id.
drop policy if exists "co_stream_participants_write_own" on public.co_stream_participants;
create policy "co_stream_participants_write_own" on public.co_stream_participants
  for all to authenticated
  using (
    auth.email() = participant_email or auth.email() = invited_by
    or exists (select 1 from public.streaming_contents sc where sc.id = co_stream_participants.stream_id and sc.created_by = auth.email())
    or public.is_admin(auth.email())
  )
  with check (
    auth.email() = participant_email or auth.email() = invited_by
    or exists (select 1 from public.streaming_contents sc where sc.id = co_stream_participants.stream_id and sc.created_by = auth.email())
    or public.is_admin(auth.email())
  );

create or replace function public.protect_co_stream_moderation() returns trigger
language plpgsql
as $$
declare
  v_is_host boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email()) then
    select exists (
      select 1 from public.streaming_contents sc where sc.id = NEW.stream_id and sc.created_by = auth.email()
    ) into v_is_host;

    if not v_is_host then
      NEW.status := OLD.status;
      NEW.can_broadcast := OLD.can_broadcast;
      NEW.can_moderate := OLD.can_moderate;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_co_stream_moderation_trg on public.co_stream_participants;
create trigger protect_co_stream_moderation_trg
before update on public.co_stream_participants
for each row execute function public.protect_co_stream_moderation();

-- livestream_polls_write_own (0050) scoped writes to creator_email/admin,
-- but voting (LivestreamPolls.jsx) updates the poll's own `options` array
-- from ANY viewer -- widen the row-level policy back to permissive and use
-- the trigger to protect everything except `options`.
drop policy if exists "livestream_polls_write_own" on public.livestream_polls;
create policy "livestream_polls_write_authenticated" on public.livestream_polls
  for all to authenticated using (true) with check (true);

create or replace function public.protect_livestream_poll_definition() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email()) then
    if TG_OP = 'INSERT' then
      if auth.email() is distinct from NEW.creator_email then
        NEW.creator_email := auth.email();
      end if;
    else
      if auth.email() is distinct from OLD.creator_email then
        NEW.creator_email := OLD.creator_email;
        NEW.stream_id := OLD.stream_id;
        NEW.status := OLD.status;
        NEW.ends_at := OLD.ends_at;
        -- `options` is intentionally left writable by any authenticated
        -- voter -- it's how a vote is recorded (0050's known trade-off).
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_livestream_poll_definition_trg on public.livestream_polls;
create trigger protect_livestream_poll_definition_trg
before insert or update on public.livestream_polls
for each row execute function public.protect_livestream_poll_definition();

-- livestream_chats_write_authenticated stays row-permissive (0001) -- add
-- column protection: the sender may still edit their own message text (or
-- self-delete), but only the stream's real host may pin/unpin, priority-
-- flag, or moderate someone else's message.
create or replace function public.protect_livestream_chat_moderation() returns trigger
language plpgsql
as $$
declare
  v_is_host boolean;
  v_is_sender boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email()) then
    select exists (
      select 1 from public.streaming_contents sc where sc.id = NEW.stream_id and sc.created_by = auth.email()
    ) into v_is_host;
    v_is_sender := auth.email() = OLD.user_email;

    if not v_is_sender then
      NEW.message := OLD.message;
    end if;

    if not v_is_host and not (v_is_sender and NEW.is_deleted) then
      NEW.is_pinned := OLD.is_pinned;
      NEW.is_deleted := OLD.is_deleted;
      NEW.is_priority := OLD.is_priority;
      NEW.badge_color := OLD.badge_color;
      NEW.user_badge := OLD.user_badge;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_livestream_chat_moderation_trg on public.livestream_chats;
create trigger protect_livestream_chat_moderation_trg
before update on public.livestream_chats
for each row execute function public.protect_livestream_chat_moderation();

-- qa_questions_write_authenticated stays row-permissive (earlier
-- migration) -- add column protection: the asker may edit their own
-- question text, any authenticated viewer may bump upvotes (matches
-- LivestreamQA.jsx's read-then-write upvote), but only the stream's real
-- host may answer or pin/change status.
create or replace function public.protect_qa_question_moderation() returns trigger
language plpgsql
as $$
declare
  v_is_host boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email()) then
    select exists (
      select 1 from public.streaming_contents sc where sc.id = NEW.stream_id and sc.created_by = auth.email()
    ) into v_is_host;

    if auth.email() is distinct from OLD.user_email then
      NEW.question := OLD.question;
    end if;

    if not v_is_host then
      NEW.answer := OLD.answer;
      NEW.status := OLD.status;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_qa_question_moderation_trg on public.qa_questions;
create trigger protect_qa_question_moderation_trg
before update on public.qa_questions
for each row execute function public.protect_qa_question_moderation();

-- reels_write_authenticated stays row-permissive (earlier migration) --
-- add column protection: only the creator may change the reel's own
-- content; liking it (liked_by/likes_count) is the one legitimate action
-- any other authenticated user performs, same for the engagement counters
-- bumped by viewing/sharing/commenting elsewhere.
create or replace function public.protect_reel_content() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email())
     and auth.email() is distinct from OLD.creator_email then
    NEW.creator_email := OLD.creator_email;
    NEW.creator_name := OLD.creator_name;
    NEW.creator_photo := OLD.creator_photo;
    NEW.video_url := OLD.video_url;
    NEW.caption := OLD.caption;
    NEW.audio_name := OLD.audio_name;
    NEW.tags := OLD.tags;
    NEW.is_public := OLD.is_public;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_reel_content_trg on public.reels;
create trigger protect_reel_content_trg
before update on public.reels
for each row execute function public.protect_reel_content();

-- events_write_authenticated stays row-permissive (earlier migration) --
-- same shape: only the organizer may change the event's own details;
-- liking/saving/sharing/viewing are the legitimate any-viewer actions.
create or replace function public.protect_event_content() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email())
     and auth.email() is distinct from OLD.organizer_email then
    NEW.organizer_email := OLD.organizer_email;
    NEW.organizer_name := OLD.organizer_name;
    NEW.organizer_photo := OLD.organizer_photo;
    NEW.capacity := OLD.capacity;
    NEW.ticket_price := OLD.ticket_price;
    NEW.status := OLD.status;
    NEW.tags := OLD.tags;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_event_content_trg on public.events;
create trigger protect_event_content_trg
before update on public.events
for each row execute function public.protect_event_content();

-- user_galleries_write_authenticated stays row-permissive (earlier
-- migration) -- same shape: only the gallery's owner may change its own
-- content; liking a photo is the any-viewer action.
create or replace function public.protect_user_gallery_content() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email())
     and auth.email() is distinct from OLD.user_email then
    NEW.user_email := OLD.user_email;
    NEW.caption := OLD.caption;
    NEW.media_url := OLD.media_url;
    NEW.media_type := OLD.media_type;
    NEW.is_pinned := OLD.is_pinned;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_user_gallery_content_trg on public.user_galleries;
create trigger protect_user_gallery_content_trg
before update on public.user_galleries
for each row execute function public.protect_user_gallery_content();

-- ad_campaigns had TWO permissive update policies fighting each other
-- (0001's owner-only ad_campaigns_update_own, and a later
-- ad_campaigns_update_metrics using(true)/with check(true) added so a
-- viewer's ad impression/click could be logged) -- multiple permissive
-- policies are OR'd together, so the wide-open one silently made the
-- owner-only one meaningless for every column, not just
-- impressions/clicks. Replace both with one permissive row policy plus a
-- trigger that actually restricts non-metric columns to the advertiser.
drop policy if exists "ad_campaigns_update_own" on public.ad_campaigns;
drop policy if exists "ad_campaigns_update_metrics" on public.ad_campaigns;
create policy "ad_campaigns_update_authenticated" on public.ad_campaigns
  for update to authenticated using (true) with check (true);

create or replace function public.protect_ad_campaign_content() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email())
     and auth.email() is distinct from OLD.advertiser_email then
    NEW.advertiser_email := OLD.advertiser_email;
    NEW.headline := OLD.headline;
    NEW.budget_amount := OLD.budget_amount;
    NEW.status := OLD.status;
    NEW.schedule := OLD.schedule;
    NEW.target_position := OLD.target_position;
    NEW.ai_optimized := OLD.ai_optimized;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_ad_campaign_content_trg on public.ad_campaigns;
create trigger protect_ad_campaign_content_trg
before update on public.ad_campaigns
for each row execute function public.protect_ad_campaign_content();
