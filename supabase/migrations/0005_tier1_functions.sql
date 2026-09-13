-- Columns needed by the Tier-1 functions in src/functions/*.js and
-- api/{bookings,delivery,account,shared}.js that 0001's generic inference
-- couldn't see yet (those functions didn't exist when it scanned the code).

alter table public.property_bookings add column if not exists property_id text;
alter table public.property_bookings add column if not exists property_title text;
alter table public.property_bookings add column if not exists guest_email text;
alter table public.property_bookings add column if not exists check_in_date timestamptz;
alter table public.property_bookings add column if not exists check_out_date timestamptz;
alter table public.property_bookings add column if not exists number_of_guests integer default 1;
alter table public.property_bookings add column if not exists special_requests text;
alter table public.property_bookings add column if not exists total_price numeric;

alter table public.car_rentals add column if not exists listing_id text;
alter table public.car_rentals add column if not exists car_year integer;
alter table public.car_rentals add column if not exists license_plate text;
alter table public.car_rentals add column if not exists car_image text;
alter table public.car_rentals add column if not exists rental_type text default 'daily';
alter table public.car_rentals add column if not exists price_per_unit numeric;
alter table public.car_rentals add column if not exists end_date timestamptz;
alter table public.car_rentals add column if not exists insurance_included boolean default false;
alter table public.car_rentals add column if not exists insurance_amount numeric;
alter table public.car_rentals add column if not exists delivery_option text;
alter table public.car_rentals add column if not exists delivery_address text;
alter table public.car_rentals add column if not exists delivery_fee numeric default 0;
alter table public.car_rentals add column if not exists unlock_method text;
alter table public.car_rentals add column if not exists security_deposit numeric;
alter table public.car_rentals add column if not exists verification_required boolean default true;
alter table public.car_rentals add column if not exists mileage_limit integer;
alter table public.car_rentals add column if not exists excess_mileage_fee numeric;
alter table public.car_rentals add column if not exists fuel_policy text;
alter table public.car_rentals add column if not exists cancellation_policy text;
alter table public.car_rentals add column if not exists selected_add_ons jsonb;
alter table public.car_rentals add column if not exists add_ons_total numeric default 0;

alter table public.damage_settlements add column if not exists rental_id uuid;
alter table public.damage_settlements add column if not exists renter_email text;
alter table public.damage_settlements add column if not exists description text;
alter table public.damage_settlements add column if not exists photos jsonb;
alter table public.damage_settlements add column if not exists estimated_cost numeric;
alter table public.damage_settlements add column if not exists suggested_settlement numeric;
alter table public.damage_settlements add column if not exists counter_offer numeric;
alter table public.damage_settlements add column if not exists ai_analysis text;

alter table public.delivery_orders add column if not exists sender_name text;
alter table public.delivery_orders add column if not exists sender_phone text;
alter table public.delivery_orders add column if not exists pickup_address text;
alter table public.delivery_orders add column if not exists delivery_address text;
alter table public.delivery_orders add column if not exists package_type text;
alter table public.delivery_orders add column if not exists package_weight numeric;
alter table public.delivery_orders add column if not exists package_value numeric;
alter table public.delivery_orders add column if not exists delivery_type text;
alter table public.delivery_orders add column if not exists urgency_level text;
alter table public.delivery_orders add column if not exists pickup_coords jsonb;
alter table public.delivery_orders add column if not exists delivery_coords jsonb;
alter table public.delivery_orders add column if not exists price_total numeric;
alter table public.delivery_orders add column if not exists driver_earnings numeric;
alter table public.delivery_orders add column if not exists distance_miles numeric;
alter table public.delivery_orders add column if not exists order_number text;
alter table public.delivery_orders add column if not exists current_location jsonb;
alter table public.delivery_orders add column if not exists location_updated_at timestamptz;

alter table public.support_tickets add column if not exists category text;
alter table public.support_messages add column if not exists message text;
alter table public.support_messages add column if not exists attachments jsonb;

alter table public.ad_campaigns add column if not exists target_position text;
alter table public.ad_campaigns add column if not exists impressions integer not null default 0;
alter table public.ad_campaigns add column if not exists clicks integer not null default 0;

alter table public.payment_methods add column if not exists details jsonb;

alter table public.user_interactions add column if not exists interaction_type text;
alter table public.user_interactions add column if not exists target_id text;
alter table public.user_interactions add column if not exists metadata jsonb;

-- ── RLS: self-owned, non-monetary rows a client can create/read directly ──
-- (all of these are requests/records the calling user is a genuine party
-- to; the actual money movement for bookings still only ever happens
-- through api/checkout.js and api/wallet.js)
drop policy if exists "property_bookings_insert_own" on public.property_bookings;
create policy "property_bookings_insert_own" on public.property_bookings
  for insert to authenticated with check (auth.email() = guest_email);

drop policy if exists "car_rentals_insert_own" on public.car_rentals;
create policy "car_rentals_insert_own" on public.car_rentals
  for insert to authenticated with check (auth.email() = renter_email);

-- delivery_orders and ride_requests already have a fully permissive
-- "authenticated can write anything" policy from 0001 (both have multiple
-- plausible owner columns — sender/driver, passenger/driver — so the
-- baseline schema left them open rather than guessing which one should
-- own writes). Narrowing that properly to "only the sender/driver/
-- passenger involved" is real follow-up work, not something to bolt on
-- here; nothing added in this migration relies on it being narrower.

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own" on public.support_tickets
  for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "support_messages_insert_own" on public.support_messages;
create policy "support_messages_insert_own" on public.support_messages
  for insert to authenticated with check (auth.email() = sender_email);

drop policy if exists "payment_methods_insert_own" on public.payment_methods;
create policy "payment_methods_insert_own" on public.payment_methods
  for insert to authenticated with check (auth.email() = user_email);

-- Ad impressions/clicks are logged by whoever VIEWS the ad, not the
-- advertiser who owns the row. Multiple PERMISSIVE policies for the same
-- command are OR'd together in Postgres, so simply adding a permissive
-- "anyone can update" policy alongside 0001's owner-only one would make
-- the owner restriction meaningless (the permissive one always wins) —
-- replace it outright instead. Ad campaign fields aren't money-sensitive
-- the way wallet/order tables are, so this follows the same reasoning as
-- 0001's own multi-party-table policies.
drop policy if exists "ad_campaigns_update_own" on public.ad_campaigns;
drop policy if exists "ad_campaigns_update_metrics" on public.ad_campaigns;
create policy "ad_campaigns_update_metrics" on public.ad_campaigns
  for update to authenticated using (true) with check (true);
