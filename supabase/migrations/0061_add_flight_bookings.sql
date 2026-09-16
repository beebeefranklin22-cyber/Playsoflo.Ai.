-- Real flight search + booking via the Duffel API (api/_handlers/flights.js).
-- Duffel is the source of truth for the actual reservation; this table is
-- our own record of what a user booked and what they paid, for their
-- booking history and for admin support/dispute lookup.
create table if not exists public.flight_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  user_email text not null,
  duffel_order_id text not null,
  booking_reference text,
  status text not null default 'confirmed',
  origin text,
  destination text,
  departure_date timestamptz,
  return_date timestamptz,
  passengers jsonb not null default '[]'::jsonb,
  slices jsonb not null default '[]'::jsonb,
  total_amount numeric not null,
  currency text not null default 'USD',
  wallet_transaction_reference text
);

create index if not exists idx_flight_bookings_user_email on public.flight_bookings(user_email);
create unique index if not exists idx_flight_bookings_duffel_order_id on public.flight_bookings(duffel_order_id);

alter table public.flight_bookings enable row level security;

create policy "flight_bookings_select_own" on public.flight_bookings
  for select to authenticated
  using (auth.email() = user_email or public.is_admin(auth.email()));

-- Insert/update only ever happen from the server (service_role, via
-- api/_handlers/flights.js) since the row records a real payment already
-- taken and a real Duffel order already created -- no client-side path
-- should ever create or modify one directly.
create policy "flight_bookings_admin_write" on public.flight_bookings
  for all to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));
