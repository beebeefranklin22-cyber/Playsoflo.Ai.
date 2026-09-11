-- Car rental hub fixes: listing creation, real payment completion,
-- pickup/dropoff state + photo documentation, damage dispute correctness,
-- and cancellation/refunds.

-- ── marketplace_items: car-listing fields ──────────────────────────────────
-- ListCarModal.jsx writes a nested rental_details/portfolio_images/add_ons/
-- variations shape; AddCarModal.jsx (used by FleetManager) writes flat
-- car_year/car_make/car_model/... columns instead. Neither set of columns
-- existed at all, so both "list a car" entry points failed outright
-- (PostgREST rejects an insert containing unknown columns). Both call
-- sites already produce a working `title`, so no code changes are needed
-- once the columns exist.
alter table public.marketplace_items add column if not exists rental_details jsonb;
alter table public.marketplace_items add column if not exists portfolio_images jsonb;
alter table public.marketplace_items add column if not exists add_ons jsonb;
alter table public.marketplace_items add column if not exists variations jsonb;
alter table public.marketplace_items add column if not exists car_year integer;
alter table public.marketplace_items add column if not exists car_make text;
alter table public.marketplace_items add column if not exists car_model text;
alter table public.marketplace_items add column if not exists car_color text;
alter table public.marketplace_items add column if not exists license_plate text;
alter table public.marketplace_items add column if not exists transmission text;
alter table public.marketplace_items add column if not exists fuel_type text;
alter table public.marketplace_items add column if not exists seats integer;
alter table public.marketplace_items add column if not exists features jsonb;

-- ── car_rentals: real payment/lifecycle tracking + RLS lockdown ────────────
alter table public.car_rentals add column if not exists payment_intent_id text;
alter table public.car_rentals add column if not exists provider_earnings numeric;
alter table public.car_rentals add column if not exists platform_fee numeric;
-- Deposit is charged only if damage is actually claimed (capped at this
-- rental's security_deposit -- see respondToSettlement in api/car-damage.js)
-- rather than pre-authorized/held at booking time: a real hold-then-capture
-- flow needs Stripe manual-capture PaymentIntents, a materially bigger
-- change than this pass covers, and pre-charging it via wallet_move would
-- risk double-charging the renter when a settlement is later accepted.
alter table public.car_rentals add column if not exists deposit_status text not null default 'none';
alter table public.car_rentals add column if not exists pickup_confirmed_at timestamptz;
alter table public.car_rentals add column if not exists pickup_confirmed_by text;
alter table public.car_rentals add column if not exists dropoff_confirmed_at timestamptz;
alter table public.car_rentals add column if not exists dropoff_confirmed_by text;
alter table public.car_rentals add column if not exists pre_rental_photos jsonb;
alter table public.car_rentals add column if not exists post_rental_photos jsonb;
alter table public.car_rentals add column if not exists pre_rental_videos jsonb;
alter table public.car_rentals add column if not exists post_rental_videos jsonb;
alter table public.car_rentals add column if not exists pre_rental_inspection jsonb;
alter table public.car_rentals add column if not exists post_rental_inspection jsonb;
alter table public.car_rentals add column if not exists photo_comparison jsonb;
alter table public.car_rentals add column if not exists new_damages_detected boolean default false;
alter table public.car_rentals add column if not exists cancelled_by text;
alter table public.car_rentals add column if not exists cancellation_reason text;
alter table public.car_rentals add column if not exists cancelled_at timestamptz;
alter table public.car_rentals add column if not exists refund_amount numeric;

-- car_rentals_write_authenticated (0001) is a leftover "authenticated can
-- write anything" policy that coexists with the narrower
-- car_rentals_insert_own (0005) -- PERMISSIVE policies OR together per
-- command, so the wide-open one still wins and any signed-in user can
-- read or overwrite any rental (someone else's driver's license upload,
-- payment status, dates, etc).
drop policy if exists "car_rentals_write_authenticated" on public.car_rentals;
drop policy if exists "car_rentals_select_authenticated" on public.car_rentals;

drop policy if exists "car_rentals_select_involved" on public.car_rentals;
create policy "car_rentals_select_involved" on public.car_rentals for select to authenticated
  using (auth.email() = renter_email or auth.email() = provider_email);

drop policy if exists "car_rentals_update_involved" on public.car_rentals;
create policy "car_rentals_update_involved" on public.car_rentals for update to authenticated
  using (auth.email() = renter_email or auth.email() = provider_email)
  with check (auth.email() = renter_email or auth.email() = provider_email);

drop policy if exists "car_rentals_delete_own" on public.car_rentals;
create policy "car_rentals_delete_own" on public.car_rentals for delete to authenticated
  using (auth.email() = renter_email);

-- ── damage_settlements: dual-consent model the UI already expects ─────────
-- CarRentals.jsx's dispute UI reads renter_response/provider_response
-- (independent per-party accept/dispute), ai_analysis as a
-- {severity, confidence_score, reasoning} object, damage_description, and
-- escalated_reason/final_settlement_amount -- none of which the backend
-- populated. respondToSettlement() also always wrote owner_response
-- regardless of which party actually responded.
alter table public.damage_settlements add column if not exists damage_description text;
alter table public.damage_settlements add column if not exists renter_response text not null default 'pending';
alter table public.damage_settlements add column if not exists provider_response text not null default 'pending';
alter table public.damage_settlements add column if not exists escalated_reason text;
alter table public.damage_settlements add column if not exists final_settlement_amount numeric;

-- ai_analysis was a plain text column but the UI reads it as an object;
-- to_jsonb() never fails (unlike ::jsonb, which would error on any
-- pre-existing non-JSON text), wrapping old plain-text values as a JSON
-- string rather than losing the migration to a cast error.
alter table public.damage_settlements alter column ai_analysis type jsonb using to_jsonb(ai_analysis);

-- Was using(true) -- any authenticated user could read every dispute on
-- the platform, including the description/photos/settlement amounts of
-- rentals they have nothing to do with.
drop policy if exists "damage_settlements_select_authenticated" on public.damage_settlements;
drop policy if exists "damage_settlements_select_involved" on public.damage_settlements;
create policy "damage_settlements_select_involved" on public.damage_settlements for select to authenticated
  using (auth.email() = renter_email or auth.email() = owner_email);

-- ── direct_messages: the car-rental "Message" button was completely
-- broken, not just invisible ────────────────────────────────────────────
-- MessageProviderButton/DirectChatModal (used from CarRentals.jsx, and any
-- other "Message" button wired to it) builds conversation_id client-side
-- as `[email1, email2].sort().join('_')` -- a string like
-- "a@x.com_b@y.com" -- but the column was typed uuid, so Postgres rejected
-- every single insert with "invalid input syntax for type uuid". Every
-- message send through this component has always failed outright.
alter table public.direct_messages alter column conversation_id type text using conversation_id::text;

-- Also was using(true)/with check(true) -- any authenticated user could
-- read or rewrite anyone else's private direct messages.
drop policy if exists "direct_messages_select_authenticated" on public.direct_messages;
drop policy if exists "direct_messages_select_involved" on public.direct_messages;
create policy "direct_messages_select_involved" on public.direct_messages for select to authenticated
  using (auth.email() = sender_email or auth.email() = recipient_email);

drop policy if exists "direct_messages_write_authenticated" on public.direct_messages;

drop policy if exists "direct_messages_insert_own" on public.direct_messages;
create policy "direct_messages_insert_own" on public.direct_messages for insert to authenticated
  with check (auth.email() = sender_email);

drop policy if exists "direct_messages_update_involved" on public.direct_messages;
create policy "direct_messages_update_involved" on public.direct_messages for update to authenticated
  using (auth.email() = sender_email or auth.email() = recipient_email)
  with check (auth.email() = sender_email or auth.email() = recipient_email);
