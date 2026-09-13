-- Backs a real Stripe SetupIntent/PaymentMethod integration (see
-- api/setup-intent.js, api/payment-methods.js). Previously "saving a card"
-- wrote fabricated last4/brand straight to `details` jsonb with no Stripe
-- API call at all, and readers throughout the UI (PaymentMethodsManager,
-- CheckoutPaymentSelector, SavedPaymentMethodSelector) expected a flat
-- `type`/`card_details`/`bank_details` shape that never matched what was
-- actually written under `details`. Add the columns those readers already
-- assume, and a home for the real Stripe references.
alter table public.profiles add column if not exists stripe_customer_id text;

alter table public.payment_methods add column if not exists type text;
alter table public.payment_methods add column if not exists card_details jsonb;
alter table public.payment_methods add column if not exists bank_details jsonb;
alter table public.payment_methods add column if not exists external_details jsonb;
alter table public.payment_methods add column if not exists crypto_details jsonb;
alter table public.payment_methods add column if not exists stripe_customer_id text;
alter table public.payment_methods add column if not exists stripe_payment_method_id text;

-- Prevents a double-submit (network retry, double click) on card setup from
-- creating two rows for the same underlying Stripe PaymentMethod. NULLs
-- (bank/external/crypto rows, which have no Stripe PM id) are exempt —
-- Postgres unique constraints never treat two NULLs as a conflict.
alter table public.payment_methods drop constraint if exists payment_methods_user_stripe_pm_unique;
alter table public.payment_methods add constraint payment_methods_user_stripe_pm_unique unique (user_email, stripe_payment_method_id);
