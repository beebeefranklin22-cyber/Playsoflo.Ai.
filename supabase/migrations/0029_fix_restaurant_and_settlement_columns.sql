-- Fixes a real column gap and an overly-broad write policy surfaced by
-- live testing: restaurants was created with a generic placeholder column
-- set that didn't match what FoodDelivery.jsx/RestaurantMenu.jsx/
-- FoodCart.jsx/RestaurantOwnerHub.jsx actually read and write (this
-- surfaced live as "column restaurants.rating does not exist").
--
-- (The other live finding on this pass -- "column damage_settlements.
-- provider_email does not exist" -- turned out not to be a missing column:
-- the car-damage server handler already stores the car provider's email in
-- damage_settlements.owner_email, which exists. The real bug was
-- CarRentals.jsx querying/reading the wrong field name; fixed there
-- instead of adding an unused duplicate column here.)
-- -----------------------------------------------------------------------------
alter table public.restaurants add column if not exists name text;
alter table public.restaurants add column if not exists description text;
alter table public.restaurants add column if not exists image_url text;
alter table public.restaurants add column if not exists cuisine_type text;
alter table public.restaurants add column if not exists rating numeric default 0;
alter table public.restaurants add column if not exists delivery_fee numeric default 0;
alter table public.restaurants add column if not exists min_order numeric default 0;
alter table public.restaurants add column if not exists is_open boolean default true;
alter table public.restaurants add column if not exists address text;
alter table public.restaurants add column if not exists phone text;
alter table public.restaurants add column if not exists latitude numeric;
alter table public.restaurants add column if not exists longitude numeric;
alter table public.restaurants add column if not exists estimated_delivery_time text;
alter table public.restaurants add column if not exists commission_rate numeric default 0.12;

-- The write policy was "using (true) with check (true)" for ALL
-- authenticated users -- any signed-in user could edit or delete any other
-- restaurant on the platform, not just their own. RestaurantOwnerHub.jsx
-- now stamps owner_email/created_by on create, so writes can be scoped to
-- the owner without breaking that flow. Reads stay open -- Food Delivery
-- lists every restaurant to every user, which is the intended behavior.
drop policy if exists "restaurants_write_authenticated" on public.restaurants;
drop policy if exists "restaurants_insert_own" on public.restaurants;
create policy "restaurants_insert_own" on public.restaurants for insert to authenticated
  with check (auth.email() = owner_email or auth.email() = created_by);
drop policy if exists "restaurants_update_own" on public.restaurants;
create policy "restaurants_update_own" on public.restaurants for update to authenticated
  using (auth.email() = owner_email or auth.email() = created_by)
  with check (auth.email() = owner_email or auth.email() = created_by);
drop policy if exists "restaurants_delete_own" on public.restaurants;
create policy "restaurants_delete_own" on public.restaurants for delete to authenticated
  using (auth.email() = owner_email or auth.email() = created_by);
