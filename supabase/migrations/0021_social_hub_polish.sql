-- Social Hub / Profiles / Privacy polish, building on 0020_security_hardening.sql.
-- Closes gaps found in a follow-up audit of the social hub specifically:
--   1. Blocking was fully decorative: a `blocks` row was written correctly
--      from the followers/following modal, but nothing ever read it. This
--      adds a public.is_blocked() helper and folds it into the privacy-aware
--      social_posts SELECT policy from migration 0020.
--   2. "Hide post" only updated local component state and never persisted,
--      so a hidden post reappeared on the next reload. Adds a durable
--      per-viewer hidden list on social_posts.
--   3. "Report" on a post only faked a success toast — moderation_flags
--      existed as a table but had no real columns to write a report into.

-- 1. Blocking enforcement -----------------------------------------------------
create or replace function public.is_blocked(a text, b text)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.blocks
    where (blocker_email = a and blocked_email = b)
       or (blocker_email = b and blocked_email = a)
  );
$$;

-- Extend the privacy-aware SELECT policy from 0020 to also hide posts
-- between two accounts where either has blocked the other.
drop policy if exists "social_posts_select_privacy_aware" on public.social_posts;
create policy "social_posts_select_privacy_aware" on public.social_posts for select to authenticated
  using (
    not public.is_blocked(auth.email(), author_email)
    and (
      auth.email() = author_email
      or auth.email() = created_by
      or not exists (
        select 1 from public.profiles p
        where p.email = social_posts.author_email and p.is_private = true
      )
      or public.is_follower(auth.email(), author_email)
    )
  );

-- 2. Persisted per-viewer "hide post" ------------------------------------------
alter table public.social_posts add column if not exists hidden_by jsonb not null default '[]'::jsonb;

-- 3. Real columns for content reports -----------------------------------------
alter table public.moderation_flags add column if not exists reporter_email text;
alter table public.moderation_flags add column if not exists content_type text;
alter table public.moderation_flags add column if not exists content_id uuid;
alter table public.moderation_flags add column if not exists reason text;
alter table public.moderation_flags add column if not exists status text default 'pending';

drop policy if exists "moderation_flags_write_authenticated" on public.moderation_flags;
drop policy if exists "moderation_flags_insert_own" on public.moderation_flags;
create policy "moderation_flags_insert_own" on public.moderation_flags for insert to authenticated
  with check (auth.email() = reporter_email);
-- Reports are visible only to their own reporter from the client; review/
-- resolution is expected to happen from a service-role admin tool, not RLS.
drop policy if exists "moderation_flags_select_authenticated" on public.moderation_flags;
drop policy if exists "moderation_flags_select_own" on public.moderation_flags;
create policy "moderation_flags_select_own" on public.moderation_flags for select to authenticated
  using (auth.email() = reporter_email);
