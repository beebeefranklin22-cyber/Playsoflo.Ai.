-- CRITICAL: every "confirm_payment_intent_id" branch across checkout.js,
-- cart-checkout.js, rides.js, property-booking.js, car-rental.js,
-- fan-pool.js, and music-distribution.js checked ONLY
-- `intent.status === 'succeeded'` before crediting a provider/artist and
-- writing an order row. None of them compared the PaymentIntent's actually
-- charged amount against the order total being confirmed, none checked the
-- intent belonged to the confirming user, and none recorded the intent as
-- consumed. Concretely: a client could create (and really pay) a $1
-- PaymentIntent, then call confirm again with an inflated order total --
-- the $1 charge would be recycled into crediting an arbitrarily large
-- amount, and the same real intent could be replayed indefinitely since
-- nothing stopped confirming it twice. This ledger plus the amount/email
-- checks added in api/_lib/orderHelpers.js's consumeVerifiedPaymentIntent
-- close all three holes with the same pattern already used for wallet
-- credits (stripe_credit_ledger, 0020_security_hardening.sql).
create table if not exists public.consumed_payment_intents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  payment_intent_id text not null,
  reference_type text
);
create unique index if not exists consumed_payment_intents_intent_unique on public.consumed_payment_intents (payment_intent_id);
alter table public.consumed_payment_intents enable row level security;
-- Written only by server handlers via the service-role client, which
-- bypasses RLS -- no policy grants any access to anon/authenticated on
-- purpose.
