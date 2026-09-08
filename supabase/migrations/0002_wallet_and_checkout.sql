-- Wallet ledger + atomic balance transfer, and the columns/tables the
-- checkout and payout endpoints (api/wallet.js, api/checkout.js) depend on
-- directly. Written by hand (separate from the auto-generated baseline
-- schema migration) because this code needs these exact columns/behavior
-- to be correct, not just "some plausible schema". Idempotent: safe to run
-- whether the baseline migration ran first, after, or not at all.

-- ── profiles: canonical USD wallet balance ─────────────────────────────────
-- The app uses several different field names for "wallet balance" in
-- different places (usd_balance, wallet_balance, soflo_balance, balance).
-- usd_balance is the dominant one (Wallet.jsx, PassengerProfile.jsx,
-- FoodDriverHub.jsx) so it's the column of record; the other call sites
-- were bugs and have been fixed to use usd_balance too.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists usd_balance numeric not null default 0;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists username text;

-- Several older screens read/write the balance under different names
-- (balance_usd, wallet_balance, wallet_balance_usd, provider_wallet_balance)
-- instead of usd_balance — genuine bugs from inconsistent naming as this
-- app grew, not intentionally distinct fields. Rather than hunt down and
-- edit every call site (high risk of missing one), keep all of them as
-- mirrors of the same value via a trigger below, so every screen reads/
-- writes the same real balance no matter which column name it uses.
alter table public.profiles add column if not exists balance_usd numeric;
alter table public.profiles add column if not exists wallet_balance numeric;
alter table public.profiles add column if not exists wallet_balance_usd numeric;
alter table public.profiles add column if not exists provider_wallet_balance numeric;

create or replace function public.sync_balance_aliases() returns trigger
language plpgsql
as $$
declare
  v numeric;
begin
  if TG_OP = 'INSERT' then
    v := coalesce(NEW.usd_balance, NEW.balance_usd, NEW.wallet_balance, NEW.wallet_balance_usd, NEW.provider_wallet_balance, 0);
  elsif NEW.usd_balance is distinct from OLD.usd_balance then
    v := NEW.usd_balance;
  elsif NEW.balance_usd is distinct from OLD.balance_usd then
    v := NEW.balance_usd;
  elsif NEW.wallet_balance is distinct from OLD.wallet_balance then
    v := NEW.wallet_balance;
  elsif NEW.wallet_balance_usd is distinct from OLD.wallet_balance_usd then
    v := NEW.wallet_balance_usd;
  elsif NEW.provider_wallet_balance is distinct from OLD.provider_wallet_balance then
    v := NEW.provider_wallet_balance;
  else
    v := coalesce(NEW.usd_balance, 0);
  end if;

  NEW.usd_balance := v;
  NEW.balance_usd := v;
  NEW.wallet_balance := v;
  NEW.wallet_balance_usd := v;
  NEW.provider_wallet_balance := v;
  return NEW;
end;
$$;

drop trigger if exists sync_balance_aliases_trg on public.profiles;
create trigger sync_balance_aliases_trg
before insert or update on public.profiles
for each row execute function public.sync_balance_aliases();

-- ── wallet_transactions: ledger of every balance change ────────────────────
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  counterparty_email text,
  amount numeric not null check (amount > 0),
  direction text not null check (direction in ('debit', 'credit')),
  reference_type text,
  reference_id text,
  memo text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_email_idx on public.wallet_transactions (user_email, created_at desc);

alter table public.wallet_transactions enable row level security;
drop policy if exists "wallet_transactions_select_own" on public.wallet_transactions;
create policy "wallet_transactions_select_own" on public.wallet_transactions
  for select using (auth.email() = user_email or auth.email() = counterparty_email);
-- No insert/update/delete policy for authenticated/anon: all writes go
-- through wallet_move() below via the service-role key.

-- ── payout_requests: withdrawals queued for real bank/instant payout ──────
-- Actually moving money to a bank account requires Stripe Connect, which
-- isn't configured yet (see api/wallet.js). Until then, withdrawals are
-- recorded here as pending_manual after the balance is deducted, so
-- nothing is lost and this can be reconciled once Connect payouts exist.
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payout_requests add column if not exists user_email text;
alter table public.payout_requests add column if not exists amount numeric;
alter table public.payout_requests add column if not exists fee_amount numeric not null default 0;
alter table public.payout_requests add column if not exists net_amount numeric;
alter table public.payout_requests add column if not exists method text;
alter table public.payout_requests add column if not exists payment_method_id text;
alter table public.payout_requests add column if not exists status text not null default 'pending_manual';

alter table public.payout_requests enable row level security;
drop policy if exists "payout_requests_select_own" on public.payout_requests;
create policy "payout_requests_select_own" on public.payout_requests
  for select using (auth.email() = user_email);

-- ── payment_requests: money-request columns used by payMoneyRequest ───────
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payment_requests add column if not exists request_type text;
alter table public.payment_requests add column if not exists requester_email text;
alter table public.payment_requests add column if not exists requester_name text;
alter table public.payment_requests add column if not exists payer_email text;
alter table public.payment_requests add column if not exists payer_name text;
alter table public.payment_requests add column if not exists amount numeric;
alter table public.payment_requests add column if not exists note text;
alter table public.payment_requests add column if not exists status text not null default 'pending';
alter table public.payment_requests add column if not exists responded_at timestamptz;

alter table public.payment_requests enable row level security;
drop policy if exists "payment_requests_select_involved" on public.payment_requests;
create policy "payment_requests_select_involved" on public.payment_requests
  for select using (auth.email() = requester_email or auth.email() = payer_email);
drop policy if exists "payment_requests_insert_own" on public.payment_requests;
create policy "payment_requests_insert_own" on public.payment_requests
  for insert with check (auth.email() = requester_email);
-- status/responded_at updates (accept/decline) go through api/wallet.js
-- (payMoneyRequest) using the service-role key, not a client-side update
-- policy, so a payer can't rewrite the request's amount when "accepting" it.

-- ── wallet_move(): the one atomic primitive all money movement uses ───────
-- Handles both a plain peer transfer (debit_amount = credit_amount) and a
-- platform-fee-skimming checkout (credit_amount < debit_amount, with the
-- difference simply not credited to anyone — that's the platform's cut).
-- Pass p_to_email = null for a pure debit (e.g. a withdrawal).
create or replace function public.wallet_move(
  p_from_email text,
  p_to_email text,
  p_debit_amount numeric,
  p_credit_amount numeric,
  p_reference_type text default null,
  p_reference_id text default null,
  p_memo text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_id uuid;
  v_from_balance numeric;
  v_to_id uuid;
begin
  if p_debit_amount is null or p_debit_amount <= 0 then
    raise exception 'debit amount must be positive';
  end if;
  if p_from_email is null then
    raise exception 'p_from_email is required';
  end if;

  select id, usd_balance into v_from_id, v_from_balance
  from public.profiles
  where email = p_from_email
  for update;

  if v_from_id is null then
    raise exception 'sender profile not found for %', p_from_email;
  end if;

  if v_from_balance < p_debit_amount then
    raise exception 'insufficient balance';
  end if;

  update public.profiles
  set usd_balance = usd_balance - p_debit_amount, updated_at = now()
  where id = v_from_id;

  insert into public.wallet_transactions (user_email, counterparty_email, amount, direction, reference_type, reference_id, memo)
  values (p_from_email, p_to_email, p_debit_amount, 'debit', p_reference_type, p_reference_id, p_memo);

  if p_to_email is not null and p_credit_amount is not null and p_credit_amount > 0 then
    select id into v_to_id from public.profiles where email = p_to_email for update;
    if v_to_id is null then
      raise exception 'recipient profile not found for %', p_to_email;
    end if;

    update public.profiles
    set usd_balance = usd_balance + p_credit_amount, updated_at = now()
    where id = v_to_id;

    insert into public.wallet_transactions (user_email, counterparty_email, amount, direction, reference_type, reference_id, memo)
    values (p_to_email, p_from_email, p_credit_amount, 'credit', p_reference_type, p_reference_id, p_memo);
  end if;

  return jsonb_build_object('success', true, 'new_balance', v_from_balance - p_debit_amount);
end;
$$;

-- Critical: this function runs as security definer (bypasses RLS on
-- profiles/wallet_transactions), so it must NEVER be callable directly by
-- anon/authenticated clients via PostgREST's auto-exposed RPC endpoint —
-- only our server (service_role, via api/wallet.js and api/checkout.js,
-- which authenticate the caller and validate the request first) may call
-- it. Revoke the default PUBLIC execute grant explicitly.
revoke all on function public.wallet_move(text, text, numeric, numeric, text, text, text) from public;
revoke all on function public.wallet_move(text, text, numeric, numeric, text, text, text) from anon;
revoke all on function public.wallet_move(text, text, numeric, numeric, text, text, text) from authenticated;
grant execute on function public.wallet_move(text, text, numeric, numeric, text, text, text) to service_role;
