-- Several money/dispute tables were left with the same "authenticated can
-- read/write anything" baseline policy 0004_lock_down_money_tables.sql
-- already fixed for other tables, but never got the same treatment. Locking
-- them down the same way: readers/writers restricted to actual parties.

-- p2p_escrows: "for all using(true) with check(true)" meant any signed-in
-- user could change any escrow's status/amounts/buyer/seller, not just
-- their own. Restrict to the two actual parties on the trade.
drop policy if exists "p2p_escrows_write_authenticated" on public.p2p_escrows;
drop policy if exists "p2p_escrows_write_own" on public.p2p_escrows;
create policy "p2p_escrows_write_own" on public.p2p_escrows
  for all to authenticated
  using (auth.email() = buyer_email or auth.email() = seller_email)
  with check (auth.email() = buyer_email or auth.email() = seller_email);

-- disputes: same "for all using(true) with check(true)" problem -- this
-- table is reused across several dispute types with different email
-- column names (ride/general disputes use initiator_email/respondent_email,
-- property disputes use complainant_email, car disputes use
-- disputer_email), so the policy checks whichever of those apply.
drop policy if exists "disputes_write_authenticated" on public.disputes;
drop policy if exists "disputes_write_own" on public.disputes;
create policy "disputes_write_own" on public.disputes
  for all to authenticated
  using (
    auth.email() = initiator_email or auth.email() = respondent_email
    or auth.email() = complainant_email or auth.email() = disputer_email
  )
  with check (
    auth.email() = initiator_email or auth.email() = respondent_email
    or auth.email() = complainant_email or auth.email() = disputer_email
  );

-- payments: "for select using(true)" let any signed-in user read every
-- other user's payment records (amounts, memos, counterparties) --
-- a platform-wide financial data leak, not just an admin-panel issue.
drop policy if exists "payments_select_authenticated" on public.payments;
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select to authenticated
  using (
    auth.email() = payer_email or auth.email() = receiver_email
    or auth.email() = recipient_email or auth.email() = sender_email
    or auth.email() = created_by
  );

-- stripe_payments: same leak, scoped by user_email.
drop policy if exists "stripe_payments_select_authenticated" on public.stripe_payments;
drop policy if exists "stripe_payments_select_own" on public.stripe_payments;
create policy "stripe_payments_select_own" on public.stripe_payments
  for select to authenticated
  using (auth.email() = user_email);

-- rent_payments: same leak, scoped to the landlord or tenant on that lease.
drop policy if exists "rent_payments_select_authenticated" on public.rent_payments;
drop policy if exists "rent_payments_select_own" on public.rent_payments;
create policy "rent_payments_select_own" on public.rent_payments
  for select to authenticated
  using (auth.email() = landlord_email or auth.email() = tenant_email);

-- bill_payments / failed_payments: same "select using(true)" leak, but
-- neither table has ANY owner/email column to scope a per-user policy to
-- (confirmed no writer anywhere ever populates one), and the one client
-- reader (Utilities.jsx) already calls .list() with no filter -- i.e. this
-- feature can't actually work correctly today regardless. Revoke read
-- access entirely rather than leave cross-user data exposed for a feature
-- that has no real per-user data model yet.
drop policy if exists "bill_payments_select_authenticated" on public.bill_payments;
drop policy if exists "failed_payments_select_authenticated" on public.failed_payments;
revoke select on public.bill_payments from authenticated, anon;
revoke select on public.failed_payments from authenticated, anon;
