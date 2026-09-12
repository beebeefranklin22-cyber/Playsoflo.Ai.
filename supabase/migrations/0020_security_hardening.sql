-- Closes several real security/money gaps found in a full read-only audit:
--   1. A Stripe payment_intent_id could be credited to a wallet an unlimited
--      number of times (api/wallet.js's old idempotency check keyed on the
--      client-supplied reference_type, not just the intent id).
--   2. `payments` had no write RLS at all (using(true) with check(true)) --
--      any signed-in user could forge/alter/delete any payment row.
--   3. `delivery_orders` had no write RLS at all -- combined with the
--      driver-email-based ownership check in api/delivery.js, any signed-in
--      user could reassign someone else's delivery to themselves and
--      collect its earnings.
--   4. `social_posts` / `comments` / `follows` / `blocks` had no write RLS
--      at all -- any signed-in user could edit or delete anyone else's row.
--   5. `stories` had no owner column at all, so it couldn't be secured or
--      have a real "hide from selected people" feature built on top of it.
--   6. No public/private profile flag existed anywhere, so the Privacy
--      Settings toggle always failed to save, and there was nothing for
--      RLS to enforce even if it had.
--   7. No uniqueness constraint on username, so two racy client-side
--      checks could both pass under real concurrency.

-- 1. Idempotency ledger for Stripe-funded wallet credits ---------------------
create table if not exists public.stripe_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  payment_intent_id text not null,
  recipient_email text not null,
  credited_amount numeric not null,
  reference_type text
);
create unique index if not exists stripe_credit_ledger_intent_unique on public.stripe_credit_ledger (payment_intent_id);
alter table public.stripe_credit_ledger enable row level security;
-- Written only by api/wallet.js via the service-role client, which bypasses
-- RLS -- no policy grants any access to anon/authenticated on purpose.

-- 2. payments: lock writes down to the payer/creator ------------------------
drop policy if exists "payments_write_authenticated" on public.payments;
drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments for insert to authenticated
  with check (auth.email() = payer_email or auth.email() = created_by);
drop policy if exists "payments_update_own" on public.payments;
create policy "payments_update_own" on public.payments for update to authenticated
  using (auth.email() = payer_email or auth.email() = created_by)
  with check (auth.email() = payer_email or auth.email() = created_by);
drop policy if exists "payments_delete_own" on public.payments;
create policy "payments_delete_own" on public.payments for delete to authenticated
  using (auth.email() = payer_email or auth.email() = created_by);

-- 3. delivery_orders: prevent claiming/reassigning someone else's delivery --
drop policy if exists "delivery_orders_write_authenticated" on public.delivery_orders;
drop policy if exists "delivery_orders_insert_own" on public.delivery_orders;
create policy "delivery_orders_insert_own" on public.delivery_orders for insert to authenticated
  with check (auth.email() = sender_email);
-- A driver may only "claim" a row that has no driver yet (driver_email is
-- null) or that's already theirs; the sender/recipient can also touch their
-- own order (e.g. leaving a review). The WITH CHECK is what actually closes
-- the hijack: after the update, driver_email must still be null or equal to
-- the caller's own email -- nobody can set it to someone else's address.
drop policy if exists "delivery_orders_update_participant" on public.delivery_orders;
create policy "delivery_orders_update_participant" on public.delivery_orders for update to authenticated
  using (driver_email is null or auth.email() = driver_email or auth.email() = sender_email or auth.email() = recipient_email)
  with check (driver_email is null or auth.email() = driver_email);
drop policy if exists "delivery_orders_delete_own" on public.delivery_orders;
create policy "delivery_orders_delete_own" on public.delivery_orders for delete to authenticated
  using (auth.email() = sender_email or auth.email() = driver_email);

-- 4a. social_posts: owner-only writes ----------------------------------------
drop policy if exists "social_posts_write_authenticated" on public.social_posts;
drop policy if exists "social_posts_insert_own" on public.social_posts;
create policy "social_posts_insert_own" on public.social_posts for insert to authenticated
  with check (auth.email() = author_email or auth.email() = created_by);
drop policy if exists "social_posts_update_own" on public.social_posts;
create policy "social_posts_update_own" on public.social_posts for update to authenticated
  using (auth.email() = author_email or auth.email() = created_by)
  with check (auth.email() = author_email or auth.email() = created_by);
drop policy if exists "social_posts_delete_own" on public.social_posts;
create policy "social_posts_delete_own" on public.social_posts for delete to authenticated
  using (auth.email() = author_email or auth.email() = created_by);

-- 4b. comments: owner-only writes --------------------------------------------
drop policy if exists "comments_write_authenticated" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert to authenticated
  with check (auth.email() = author_email or auth.email() = user_email);
drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments for update to authenticated
  using (auth.email() = author_email or auth.email() = user_email)
  with check (auth.email() = author_email or auth.email() = user_email);
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments for delete to authenticated
  using (auth.email() = author_email or auth.email() = user_email);

-- 4c. follows: owner-only writes ---------------------------------------------
drop policy if exists "follows_write_authenticated" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert to authenticated
  with check (auth.email() = follower_email);
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete to authenticated
  using (auth.email() = follower_email);

-- 4d. blocks: owner-only writes -----------------------------------------------
drop policy if exists "blocks_write_authenticated" on public.blocks;
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert to authenticated
  with check (auth.email() = blocker_email);
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete to authenticated
  using (auth.email() = blocker_email);

-- 5. stories: add a real owner column and secure writes ----------------------
alter table public.stories add column if not exists creator_email text;
drop policy if exists "stories_write_authenticated" on public.stories;
drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories for insert to authenticated
  with check (auth.email() = creator_email);
drop policy if exists "stories_update_own" on public.stories;
create policy "stories_update_own" on public.stories for update to authenticated
  using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories for delete to authenticated
  using (auth.email() = creator_email);

-- 6. Public/private profiles --------------------------------------------------
alter table public.profiles add column if not exists is_private boolean default false;

create or replace function public.is_follower(p_viewer text, p_target text)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.follows
    where follower_email = p_viewer and following_email = p_target
  );
$$;

-- Posts from a private account are only visible to the author or someone
-- who follows them; public accounts stay visible to everyone signed in.
drop policy if exists "social_posts_select_authenticated" on public.social_posts;
create policy "social_posts_select_privacy_aware" on public.social_posts for select to authenticated
  using (
    auth.email() = author_email
    or auth.email() = created_by
    or not exists (
      select 1 from public.profiles p
      where p.email = social_posts.author_email and p.is_private = true
    )
    or public.is_follower(auth.email(), author_email)
  );

-- 7. Username uniqueness ------------------------------------------------------
-- Partial (case-insensitive) unique index: null/blank usernames are common
-- during onboarding and shouldn't collide with each other.
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null and username <> '';
