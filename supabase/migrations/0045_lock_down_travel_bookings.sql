-- travel_bookings had "for all using(true) with check(true)" (and select
-- was equally open) -- any authenticated user could read or rewrite any
-- travel booking in the system, including marking it payment_status:
-- 'paid'/status: 'confirmed' with no payment ever having happened
-- (TravelBookingModal.jsx did exactly this from the client, right after
-- the real Stripe charge -- but nothing stopped the SAME write being sent
-- standalone, for a booking never paid for, or belonging to someone else).
drop policy if exists "travel_bookings_select_authenticated" on public.travel_bookings;
drop policy if exists "travel_bookings_select_own" on public.travel_bookings;
create policy "travel_bookings_select_own" on public.travel_bookings
  for select to authenticated
  using (auth.email() = customer_email or auth.email() = provider_email);

drop policy if exists "travel_bookings_write_authenticated" on public.travel_bookings;
drop policy if exists "travel_bookings_write_own" on public.travel_bookings;
create policy "travel_bookings_write_own" on public.travel_bookings
  for all to authenticated
  using (auth.email() = customer_email or auth.email() = provider_email)
  with check (auth.email() = customer_email or auth.email() = provider_email);

-- payment_status/status can only ever become "paid"/"confirmed" via the
-- service role now -- see api/_handlers/wallet.js's credit_from_payment,
-- which only does so after independently re-verifying the Stripe charge.
-- The client no longer marks its own booking paid.
create or replace function public.protect_travel_booking_payment_status() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      NEW.payment_status := 'pending';
      NEW.status := 'pending';
    else
      NEW.payment_status := OLD.payment_status;
      NEW.status := OLD.status;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_travel_booking_payment_status_trg on public.travel_bookings;
create trigger protect_travel_booking_payment_status_trg
before insert or update on public.travel_bookings
for each row execute function public.protect_travel_booking_payment_status();
