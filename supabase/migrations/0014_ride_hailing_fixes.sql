-- Ride-hailing fare payment + payout integrity fixes.
--
-- Problems found:
-- 1. ride_requests RLS ("using (true) with check (true)" from 0001) lets any
--    authenticated user read or overwrite any ride, including one another
--    passenger's pickup address or completing/paying someone else's ride.
-- 2. HailRideModal never sets created_by/passenger_email on the ride it
--    creates, so MyRides/RideHistory (which filter by created_by) never see
--    the ride, and server-side actions that check
--    ride.passenger_email === user.email (cancel, rate_driver) always
--    reject the real passenger. Fixed in api/rides.js's new request_ride
--    action, which force-sets both from the authenticated user rather than
--    trusting the client.
-- 3. Fare payment was entirely fake (client-side only) and driver payout on
--    completion never happened at all. Both are now real server actions
--    (api/rides.js request_ride / complete) using wallet_move, mirroring
--    the property_bookings payment pattern.

alter table public.ride_requests add column if not exists payment_intent_id text;
alter table public.ride_requests add column if not exists driver_paid boolean not null default false;

-- created_by is the field MyRides/RideHistory already filter by;
-- passenger_email is what api/rides.js's cancel/rate_driver actions check.
-- Some existing create call sites (UnifiedCheckoutModal) only set
-- passenger_email, others (should, going forward) only set created_by via
-- the server action -- accept either as "you are involved in this ride".
drop policy if exists "ride_requests_select_authenticated" on public.ride_requests;
drop policy if exists "ride_requests_select_involved" on public.ride_requests;
create policy "ride_requests_select_involved" on public.ride_requests for select to authenticated
  using (
    auth.email() = created_by or auth.email() = passenger_email or auth.email() = driver_email
    or (status = 'requested' and driver_email is null)
  );

drop policy if exists "ride_requests_write_authenticated" on public.ride_requests;

drop policy if exists "ride_requests_insert_own" on public.ride_requests;
create policy "ride_requests_insert_own" on public.ride_requests for insert to authenticated
  with check (auth.email() = created_by or auth.email() = passenger_email);

-- WITH CHECK also allows the row to *stay* unclaimed (status='requested',
-- driver_email still null) so a driver can decline/pass on an open request
-- (RideRequestCard's handleDecline only flips driver_status, it doesn't --
-- and structurally can't, since driver_status is a single shared field, not
-- per-driver -- claim the ride) without becoming its passenger or driver.
drop policy if exists "ride_requests_update_involved" on public.ride_requests;
create policy "ride_requests_update_involved" on public.ride_requests for update to authenticated
  using (
    auth.email() = created_by or auth.email() = passenger_email or auth.email() = driver_email
    or (status = 'requested' and driver_email is null)
  )
  with check (
    auth.email() = created_by or auth.email() = passenger_email or auth.email() = driver_email
    or (status = 'requested' and driver_email is null)
  );

drop policy if exists "ride_requests_delete_involved" on public.ride_requests;
create policy "ride_requests_delete_involved" on public.ride_requests for delete to authenticated
  using (auth.email() = created_by or auth.email() = passenger_email);
