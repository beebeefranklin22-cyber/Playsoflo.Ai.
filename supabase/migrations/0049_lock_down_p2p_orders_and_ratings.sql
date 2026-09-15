-- P2P crypto escrow trading has been paused in the UI (P2PTradingMarketplace.jsx,
-- P2POrderDetails.jsx, MyP2POrders.jsx) because its one real settlement
-- step (releasing escrow) called a Supabase Edge Function that was never
-- actually deployed, and no step anywhere ever locked the seller's
-- crypto_wallets balance when a trade was "matched" -- there was nothing
-- real for a release to move. That freeze is client-side only:
-- p2p_orders_write_authenticated was still "using(true)/with check(true)",
-- so anyone could hit the API directly and set themselves as the buyer on
-- someone else's listing, mark any order "completed" to fabricate a trade
-- history, or cancel a stranger's active order. Locking this to the real
-- parties (seller/buyer) closes that regardless of what the frontend does.
drop policy if exists "p2p_orders_write_authenticated" on public.p2p_orders;

create policy "p2p_orders_write_own" on public.p2p_orders
  for all to authenticated
  using (auth.email() = seller_email or auth.email() = buyer_email or public.is_admin(auth.email()))
  with check (auth.email() = seller_email or auth.email() = buyer_email or public.is_admin(auth.email()));

-- trader_ratings_write_authenticated was equally wide open, letting any
-- signed-in user post a rating as anyone (rater_email is client-supplied)
-- or edit/delete someone else's existing rating -- undermining the whole
-- reputation system this trading feature depends on. No file in this
-- codebase ever updates or deletes a TraderRating, so scoping those to
-- admin-only breaks nothing today.
drop policy if exists "trader_ratings_write_authenticated" on public.trader_ratings;

create policy "trader_ratings_insert_own" on public.trader_ratings
  for insert to authenticated
  with check (auth.email() = rater_email);

create policy "trader_ratings_update_admin" on public.trader_ratings
  for update to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));

create policy "trader_ratings_delete_admin" on public.trader_ratings
  for delete to authenticated
  using (public.is_admin(auth.email()));
