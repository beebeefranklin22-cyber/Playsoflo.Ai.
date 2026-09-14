-- SubscriptionManagementModal.jsx now records the Stripe PaymentIntent that
-- funded a paid subscription tier (for refunds/reconciliation) -- this
-- column didn't exist yet, so inserting it would fail outright.
alter table public.user_subscriptions add column if not exists payment_intent_id text;
