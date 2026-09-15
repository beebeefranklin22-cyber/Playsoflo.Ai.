-- Closes out the last of the 64-table audit's deferred "Group B" tables --
-- schema-empty shells (id/timestamps plus at most one or two stray
-- columns) that were left alone pending a reachability check. That check
-- is now done; each falls into one of two buckets.
--
-- Bucket 1: read-only catalog/informational content with a live, routed
-- page reading it (Help.jsx -> help_guides, TravelMap.jsx -> travel_alerts,
-- GameShop.jsx -> game_items, TicketAffiliateStats.jsx -> ticket_affiliates)
-- but genuinely zero create()/update() call sites anywhere in the app --
-- these are meant to be admin/seed-managed catalogs, not user-writable, so
-- reads stay open and writes move to admin-only.
drop policy if exists "help_guides_write_authenticated" on public.help_guides;
create policy "help_guides_write_admin" on public.help_guides
  for all to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));

drop policy if exists "travel_alerts_write_authenticated" on public.travel_alerts;
create policy "travel_alerts_write_admin" on public.travel_alerts
  for all to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));

drop policy if exists "game_items_write_authenticated" on public.game_items;
create policy "game_items_write_admin" on public.game_items
  for all to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));

drop policy if exists "ticket_affiliates_write_authenticated" on public.ticket_affiliates;
create policy "ticket_affiliates_write_admin" on public.ticket_affiliates
  for all to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));

-- Bucket 2: genuinely zero references anywhere in the app -- no page,
-- component, or server handler reads or writes these at all. Locked to
-- admin-only entirely (same treatment as collaborative_documents/
-- document_comments), closing the direct-API hole with nothing reachable
-- to break.
drop policy if exists "two_factor_codes_select_authenticated" on public.two_factor_codes;
drop policy if exists "two_factor_codes_write_authenticated" on public.two_factor_codes;
create policy "two_factor_codes_admin_only" on public.two_factor_codes
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "escrow_transactions_select_authenticated" on public.escrow_transactions;
drop policy if exists "escrow_transactions_write_authenticated" on public.escrow_transactions;
create policy "escrow_transactions_admin_only" on public.escrow_transactions
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "failed_payments_select_authenticated" on public.failed_payments;
drop policy if exists "failed_payments_write_authenticated" on public.failed_payments;
create policy "failed_payments_admin_only" on public.failed_payments
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "p2p_transactions_select_authenticated" on public.p2p_transactions;
drop policy if exists "p2p_transactions_write_authenticated" on public.p2p_transactions;
create policy "p2p_transactions_admin_only" on public.p2p_transactions
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "ai_recommendations_select_authenticated" on public.ai_recommendations;
drop policy if exists "ai_recommendations_write_authenticated" on public.ai_recommendations;
create policy "ai_recommendations_admin_only" on public.ai_recommendations
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "ai_tools_select_authenticated" on public.ai_tools;
drop policy if exists "ai_tools_write_authenticated" on public.ai_tools;
create policy "ai_tools_admin_only" on public.ai_tools
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "forum_likes_select_authenticated" on public.forum_likes;
drop policy if exists "forum_likes_write_authenticated" on public.forum_likes;
create policy "forum_likes_admin_only" on public.forum_likes
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "forum_posts_select_authenticated" on public.forum_posts;
drop policy if exists "forum_posts_write_authenticated" on public.forum_posts;
create policy "forum_posts_admin_only" on public.forum_posts
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "user_job_preferences_select_authenticated" on public.user_job_preferences;
drop policy if exists "user_job_preferences_write_authenticated" on public.user_job_preferences;
create policy "user_job_preferences_admin_only" on public.user_job_preferences
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));

drop policy if exists "video_likes_select_authenticated" on public.video_likes;
drop policy if exists "video_likes_write_authenticated" on public.video_likes;
create policy "video_likes_admin_only" on public.video_likes
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));
