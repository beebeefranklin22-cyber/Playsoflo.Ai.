-- ride_requests_insert_own and ride_requests_update_involved
-- (0014_ride_hailing_fixes.sql) let a rider insert their own ride row and
-- the assigned driver update it (needed for legitimate status transitions:
-- accepted -> en_route -> arrived -> completed) via the ordinary anon-key
-- client -- but RLS is row-level only, it can't restrict WHICH columns a
-- permitted write touches or what values they carry. Without this:
--   - A rider could INSERT a ride directly (bypassing requestRideSecure
--     entirely, never paying anything) with a copied or fabricated
--     fare_breakdown.driver_earnings baked in from the start -- confirmed
--     live via RideHistory.jsx's "Rebook" button, which does exactly this.
--   - A driver could UPDATE their own ride row to inflate
--     fare_breakdown.driver_earnings before completing it (completeRide in
--     api/_handlers/rides.js pays out whatever number is sitting in that
--     column -- same trust boundary protect_balance_columns already
--     defends on profiles/usd_balance for exactly this reason), or reset
--     driver_paid back to false after a real completion to replay the
--     payout a second time.
--
-- Same pattern as protect_balance_columns (0004_lock_down_money_tables.sql):
-- a trigger, not RLS, since only a trigger can express "any column except
-- these two, and only from a trusted writer." api/_handlers/rides.js (the
-- only legitimate writer of either column, on both insert and update) uses
-- the service-role client, so none of this affects it.
create or replace function public.protect_ride_payout_columns() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      NEW.fare_breakdown := null;
      NEW.driver_paid := false;
    else
      NEW.fare_breakdown := OLD.fare_breakdown;
      NEW.driver_paid := OLD.driver_paid;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_ride_payout_columns_trg on public.ride_requests;
create trigger protect_ride_payout_columns_trg
before insert or update on public.ride_requests
for each row execute function public.protect_ride_payout_columns();
