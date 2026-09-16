-- Adds ancillary (seats/bags/cancel-for-any-reason) and fee-breakdown
-- columns to flight_bookings, needed now that booking can include add-ons
-- priced and validated server-side against Duffel's live offer, and now
-- that the wallet charge (duffel_amount * 1.012) differs from what Duffel
-- actually gets paid (duffel_amount) -- keeping both, plus the fee itself,
-- makes support/dispute lookups and accounting reconciliation possible
-- without having to recompute anything after the fact.
alter table public.flight_bookings
  add column if not exists services jsonb not null default '[]'::jsonb,
  add column if not exists duffel_amount numeric,
  add column if not exists platform_fee_amount numeric;

-- Backfill existing rows (booked before ancillaries/fee tracking existed)
-- so duffel_amount is never null for a real row -- they had no platform
-- fee applied, so duffel_amount equals what was charged.
update public.flight_bookings
set duffel_amount = total_amount, platform_fee_amount = 0
where duffel_amount is null;
