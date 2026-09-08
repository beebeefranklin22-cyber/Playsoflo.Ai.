-- 0001_baseline_schema.sql (an auto-generated defensive baseline covering
-- every entities.js table generically) granted every authenticated user
-- full INSERT/UPDATE/DELETE on several tables that api/checkout.js and
-- api/wallet.js are specifically designed to be the ONLY writers of —
-- because those endpoints are what compute the platform fee correctly,
-- verify a Stripe payment actually succeeded before creating an order, and
-- check a sender's balance atomically. A blanket "authenticated can write
-- anything" policy on these same tables means any signed-in user could
-- bypass all of that: insert a fake "confirmed" order for $0, mark their
-- own payment_requests row "paid" without paying, insert a payout_requests
-- row that pays out a balance nobody deducted, etc.
--
-- This migration must run AFTER 0001 (and after 0002/0003, which is where
-- these tables' real columns and intended RLS were defined) so its
-- REVOKE/DROP POLICY calls are the ones left in effect. Selecting rows you
-- are a party to is still allowed (via the policies already created in
-- 0002/0003) — only direct client-side writes are removed.
do $$
declare
  t text;
begin
  foreach t in array array[
    'service_bookings', 'orders', 'food_orders', 'subscriptions',
    'content_purchases', 'payment_requests', 'payout_requests'
  ] loop
    execute format('revoke insert, update, delete on public.%I from authenticated', t);
    execute format('revoke insert, update, delete on public.%I from anon', t);
    execute format('drop policy if exists "%1$s_write_authenticated" on public.%1$I', t);
  end loop;
end $$;

-- payment_requests is the one exception that still needs a narrow
-- client-side insert path: a user creating their own money/refund request
-- (RequestMoneyModal, RequestRefundModal). Re-assert it in case 0001's
-- broader policy touched the same name, or 0002 hasn't run in this
-- environment for some reason.
drop policy if exists "payment_requests_insert_own" on public.payment_requests;
create policy "payment_requests_insert_own" on public.payment_requests
  for insert to authenticated with check (auth.email() = requester_email);

-- ── profiles: even more critical — protect the balance columns directly ──
-- 0001 also grants "update own row" on profiles with no column
-- restriction, and RLS is row-level only (it can't limit which columns a
-- permitted UPDATE touches). Without this, any signed-in user could set
-- their own usd_balance (or any of its mirrored aliases — see 0002) to any
-- value with a single client-side call. Row Level Security's USING/CHECK
-- can't express "any column except this one", so this is enforced with a
-- trigger instead: it silently keeps the balance columns unchanged for any
-- write that isn't running as service_role (verified empirically — see
-- the PR description — that current_setting('role') correctly reads
-- 'service_role' inside wallet_move()'s SECURITY DEFINER body precisely
-- because PostgREST sets the Postgres role for the whole request based on
-- the caller's key, and SECURITY DEFINER changes the effective privilege
-- user, not that session-level role setting).
create or replace function public.protect_balance_columns() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      NEW.usd_balance := 0;
      NEW.balance_usd := 0;
      NEW.wallet_balance := 0;
      NEW.wallet_balance_usd := 0;
      NEW.provider_wallet_balance := 0;
    else
      NEW.usd_balance := OLD.usd_balance;
      NEW.balance_usd := OLD.balance_usd;
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.wallet_balance_usd := OLD.wallet_balance_usd;
      NEW.provider_wallet_balance := OLD.provider_wallet_balance;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_balance_columns_trg on public.profiles;
create trigger protect_balance_columns_trg
before insert or update on public.profiles
for each row execute function public.protect_balance_columns();
