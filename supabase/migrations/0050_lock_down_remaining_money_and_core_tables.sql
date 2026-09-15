-- A full-platform security re-audit found 64 tables still carrying the
-- base44-inherited "_write_authenticated" policy (using(true) with
-- check(true)) -- any signed-in user could read, forge, or overwrite any
-- other user's row. Earlier fix rounds this engagement closed the ones
-- discovered while chasing specific broken features; this migration closes
-- the remaining tables that hold real money, real contracts, or real
-- orders/bookings, using the same owner-or-admin pattern already proven
-- throughout this series (is_admin() escape hatch where an admin action on
-- the table makes sense). A second, smaller batch of lower-risk
-- social/engagement tables (reels, events, livestream_chats, etc.) was
-- already given a deliberate (if incomplete) fix in an earlier migration
-- and is left alone here; streaming_contents and collaborative_videos
-- remain separately flagged/deferred as documented elsewhere.

-- ── Money / purchases ───────────────────────────────────────────────────
drop policy if exists "payment_requests_write_authenticated" on public.payment_requests;
create policy "payment_requests_write_own" on public.payment_requests
  for all to authenticated
  using (auth.email() = requester_email or auth.email() = payer_email or public.is_admin(auth.email()))
  with check (auth.email() = requester_email or auth.email() = payer_email or public.is_admin(auth.email()));

drop policy if exists "payout_requests_write_authenticated" on public.payout_requests;
create policy "payout_requests_write_own" on public.payout_requests
  for all to authenticated
  using (auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or public.is_admin(auth.email()));

drop policy if exists "rent_payments_write_authenticated" on public.rent_payments;
create policy "rent_payments_write_own" on public.rent_payments
  for all to authenticated
  using (auth.email() = tenant_email or auth.email() = landlord_email or public.is_admin(auth.email()))
  with check (auth.email() = tenant_email or auth.email() = landlord_email or public.is_admin(auth.email()));

drop policy if exists "tip_transactions_write_authenticated" on public.tip_transactions;
create policy "tip_transactions_write_own" on public.tip_transactions
  for all to authenticated
  using (
    auth.email() = tipper_email or auth.email() = from_email
    or auth.email() = recipient_email or auth.email() = creator_email
    or public.is_admin(auth.email())
  )
  with check (
    auth.email() = tipper_email or auth.email() = from_email
    or auth.email() = recipient_email or auth.email() = creator_email
    or public.is_admin(auth.email())
  );

drop policy if exists "subscriptions_write_authenticated" on public.subscriptions;
create policy "subscriptions_write_own" on public.subscriptions
  for all to authenticated
  using (auth.email() = customer_email or auth.email() = provider_email or public.is_admin(auth.email()))
  with check (auth.email() = customer_email or auth.email() = provider_email or public.is_admin(auth.email()));

drop policy if exists "user_subscriptions_write_authenticated" on public.user_subscriptions;
create policy "user_subscriptions_write_own" on public.user_subscriptions
  for all to authenticated
  using (auth.email() = subscriber_email or auth.email() = creator_email or auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = subscriber_email or auth.email() = creator_email or auth.email() = user_email or public.is_admin(auth.email()));

drop policy if exists "membership_subscriptions_write_authenticated" on public.membership_subscriptions;
create policy "membership_subscriptions_write_own" on public.membership_subscriptions
  for all to authenticated
  using (auth.email() = user_email or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "creator_subscriptions_write_authenticated" on public.creator_subscriptions;
create policy "creator_subscriptions_write_own" on public.creator_subscriptions
  for all to authenticated
  using (auth.email() = subscriber_email or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = subscriber_email or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "content_purchases_write_authenticated" on public.content_purchases;
create policy "content_purchases_write_own" on public.content_purchases
  for all to authenticated
  using (auth.email() = buyer_email or auth.email() = seller_email or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = buyer_email or auth.email() = seller_email or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "ppv_purchases_write_authenticated" on public.ppv_purchases;
create policy "ppv_purchases_write_own" on public.ppv_purchases
  for all to authenticated
  using (auth.email() = user_email or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "digital_products_write_authenticated" on public.digital_products;
create policy "digital_products_write_own" on public.digital_products
  for all to authenticated
  using (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "creator_products_write_authenticated" on public.creator_products;
create policy "creator_products_write_own" on public.creator_products
  for all to authenticated
  using (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "marketplace_items_write_authenticated" on public.marketplace_items;
create policy "marketplace_items_write_own" on public.marketplace_items
  for all to authenticated
  using (auth.email() = created_by or auth.email() = provider_email or auth.email() = seller_email or public.is_admin(auth.email()))
  with check (auth.email() = created_by or auth.email() = provider_email or auth.email() = seller_email or public.is_admin(auth.email()));

-- ── Orders / bookings / contracts ───────────────────────────────────────
drop policy if exists "bookings_write_authenticated" on public.bookings;
create policy "bookings_write_own" on public.bookings
  for all to authenticated
  using (auth.email() = created_by or auth.email() = host_email or auth.email() = provider_email or public.is_admin(auth.email()))
  with check (auth.email() = created_by or auth.email() = host_email or auth.email() = provider_email or public.is_admin(auth.email()));

drop policy if exists "food_orders_write_authenticated" on public.food_orders;
create policy "food_orders_write_own" on public.food_orders
  for all to authenticated
  using (
    auth.email() = customer_email or auth.email() = provider_email or auth.email() = driver_email
    or auth.email() = owner_email or auth.email() = user_email or auth.email() = restaurant_owner_email
    or public.is_admin(auth.email())
  )
  with check (
    auth.email() = customer_email or auth.email() = provider_email or auth.email() = driver_email
    or auth.email() = owner_email or auth.email() = user_email or auth.email() = restaurant_owner_email
    or public.is_admin(auth.email())
  );

drop policy if exists "orders_write_authenticated" on public.orders;
create policy "orders_write_own" on public.orders
  for all to authenticated
  using (auth.email() = customer_email or auth.email() = provider_email or auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = customer_email or auth.email() = provider_email or auth.email() = user_email or public.is_admin(auth.email()));

drop policy if exists "service_agreements_write_authenticated" on public.service_agreements;
create policy "service_agreements_write_own" on public.service_agreements
  for all to authenticated
  using (auth.email() = customer_email or auth.email() = provider_email or public.is_admin(auth.email()))
  with check (auth.email() = customer_email or auth.email() = provider_email or public.is_admin(auth.email()));

drop policy if exists "service_bookings_write_authenticated" on public.service_bookings;
create policy "service_bookings_write_own" on public.service_bookings
  for all to authenticated
  using (auth.email() = customer_email or auth.email() = provider_email or public.is_admin(auth.email()))
  with check (auth.email() = customer_email or auth.email() = provider_email or public.is_admin(auth.email()));

drop policy if exists "service_contracts_write_authenticated" on public.service_contracts;
create policy "service_contracts_write_own" on public.service_contracts
  for all to authenticated
  using (
    auth.email() = creator_email or auth.email() = provider_email or auth.email() = recipient_email
    or public.is_admin(auth.email())
  )
  with check (
    auth.email() = creator_email or auth.email() = provider_email or auth.email() = recipient_email
    or public.is_admin(auth.email())
  );

drop policy if exists "maintenance_requests_write_authenticated" on public.maintenance_requests;
create policy "maintenance_requests_write_own" on public.maintenance_requests
  for all to authenticated
  using (auth.email() = tenant_email or auth.email() = landlord_email or public.is_admin(auth.email()))
  with check (auth.email() = tenant_email or auth.email() = landlord_email or public.is_admin(auth.email()));

-- lease_documents has no party column of its own -- ownership comes from
-- the lease it belongs to (same join pattern as lease_applications, 0043).
drop policy if exists "lease_documents_write_authenticated" on public.lease_documents;
create policy "lease_documents_write_own" on public.lease_documents
  for all to authenticated
  using (
    exists (select 1 from public.leases l where l.id = lease_documents.lease_id and (l.landlord_email = auth.email() or l.tenant_email = auth.email()))
    or public.is_admin(auth.email())
  )
  with check (
    exists (select 1 from public.leases l where l.id = lease_documents.lease_id and (l.landlord_email = auth.email() or l.tenant_email = auth.email()))
    or public.is_admin(auth.email())
  );

-- music_contracts has no per-party email column at all (parties is a
-- free-form jsonb blob describing the deal, not an enforceable identity) --
-- it's explicitly an admin-review workflow (status starts
-- "pending_admin_review"), so anyone may submit one for review, but only
-- admin may change its status/content afterward.
drop policy if exists "music_contracts_write_authenticated" on public.music_contracts;
create policy "music_contracts_insert_authenticated" on public.music_contracts
  for insert to authenticated with check (true);
create policy "music_contracts_update_admin" on public.music_contracts
  for update to authenticated using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));
create policy "music_contracts_delete_admin" on public.music_contracts
  for delete to authenticated using (public.is_admin(auth.email()));

-- ── Ratings / reputation ────────────────────────────────────────────────
drop policy if exists "driver_ratings_write_authenticated" on public.driver_ratings;
create policy "driver_ratings_insert_own" on public.driver_ratings
  for insert to authenticated with check (auth.email() = passenger_email);
create policy "driver_ratings_update_admin" on public.driver_ratings
  for update to authenticated using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));
create policy "driver_ratings_delete_own" on public.driver_ratings
  for delete to authenticated using (auth.email() = passenger_email or public.is_admin(auth.email()));

drop policy if exists "ratings_write_authenticated" on public.ratings;
create policy "ratings_insert_own" on public.ratings
  for insert to authenticated with check (auth.email() = rater_email);
create policy "ratings_update_admin" on public.ratings
  for update to authenticated using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));
create policy "ratings_delete_own" on public.ratings
  for delete to authenticated using (auth.email() = rater_email or public.is_admin(auth.email()));

-- ── Social graph ─────────────────────────────────────────────────────────
drop policy if exists "friendships_write_authenticated" on public.friendships;
create policy "friendships_write_own" on public.friendships
  for all to authenticated
  using (auth.email() = user1_email or auth.email() = user2_email or public.is_admin(auth.email()))
  with check (auth.email() = user1_email or auth.email() = user2_email or public.is_admin(auth.email()));

drop policy if exists "friend_requests_write_authenticated" on public.friend_requests;
create policy "friend_requests_write_own" on public.friend_requests
  for all to authenticated
  using (auth.email() = from_email or auth.email() = to_email or public.is_admin(auth.email()))
  with check (auth.email() = from_email or auth.email() = to_email or public.is_admin(auth.email()));

drop policy if exists "follow_requests_write_authenticated" on public.follow_requests;
create policy "follow_requests_write_own" on public.follow_requests
  for all to authenticated
  using (auth.email() = from_email or auth.email() = to_email or public.is_admin(auth.email()))
  with check (auth.email() = from_email or auth.email() = to_email or public.is_admin(auth.email()));

-- ── Content / livestream ─────────────────────────────────────────────────
drop policy if exists "video_posts_write_authenticated" on public.video_posts;
create policy "video_posts_write_own" on public.video_posts
  for all to authenticated
  using (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = created_by or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "viewer_analytics_write_authenticated" on public.viewer_analytics;
create policy "viewer_analytics_write_own" on public.viewer_analytics
  for all to authenticated
  using (auth.email() = viewer_email or auth.email() = created_by or public.is_admin(auth.email()))
  with check (auth.email() = viewer_email or auth.email() = created_by or public.is_admin(auth.email()));

drop policy if exists "livestream_tickets_write_authenticated" on public.livestream_tickets;
create policy "livestream_tickets_write_own" on public.livestream_tickets
  for all to authenticated
  using (auth.email() = user_email or auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "co_stream_participants_write_authenticated" on public.co_stream_participants;
create policy "co_stream_participants_write_own" on public.co_stream_participants
  for all to authenticated
  using (auth.email() = participant_email or auth.email() = invited_by or public.is_admin(auth.email()))
  with check (auth.email() = participant_email or auth.email() = invited_by or public.is_admin(auth.email()));

drop policy if exists "livestream_polls_write_authenticated" on public.livestream_polls;
create policy "livestream_polls_write_own" on public.livestream_polls
  for all to authenticated
  using (auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = creator_email or public.is_admin(auth.email()));

drop policy if exists "user_galleries_write_authenticated" on public.user_galleries;
create policy "user_galleries_write_own" on public.user_galleries
  for all to authenticated
  using (auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or public.is_admin(auth.email()));

-- watch_party_playlists has no party column of its own -- ownership comes
-- from the watch party it belongs to (host or an invited participant).
drop policy if exists "watch_party_playlists_write_authenticated" on public.watch_party_playlists;
create policy "watch_party_playlists_write_participant" on public.watch_party_playlists
  for all to authenticated
  using (
    exists (
      select 1 from public.watch_parties wp
      where wp.id = watch_party_playlists.party_id
        and (wp.host_email = auth.email() or wp.participants @> to_jsonb(auth.email()))
    )
    or public.is_admin(auth.email())
  )
  with check (
    exists (
      select 1 from public.watch_parties wp
      where wp.id = watch_party_playlists.party_id
        and (wp.host_email = auth.email() or wp.participants @> to_jsonb(auth.email()))
    )
    or public.is_admin(auth.email())
  );
