-- handleWithdraw (api/_handlers/wallet.js) can now attempt a real payout via
-- Stripe Connect (transfer platform -> connected account, then payout ->
-- their bank) when the withdrawing user has a connected account with
-- payouts_enabled. These columns record what actually happened; status
-- keeps using 'pending_manual' as the fallback when Connect isn't set up
-- yet or the real payout attempt itself fails, so nothing here changes the
-- existing manual-fulfillment path -- it's additive.
alter table public.payout_requests add column if not exists stripe_transfer_id text;
alter table public.payout_requests add column if not exists stripe_payout_id text;
alter table public.payout_requests add column if not exists failure_reason text;
