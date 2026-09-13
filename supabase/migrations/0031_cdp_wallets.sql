-- Backs the real on-chain (Base Sepolia testnet) wallet feature added in
-- api/_handlers/crypto-wallet.js. Coinbase's CDP API is the source of
-- truth for whether a wallet exists and what its balance is -- this table
-- is only a display cache (address + faucet cooldown), never written to
-- or read from directly by the client. All access goes through the
-- service role from that one server handler, which verifies the caller's
-- identity from their auth token first.
create table if not exists public.cdp_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_email text not null,
  address text not null,
  network text not null default 'base-sepolia',
  last_faucet_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cdp_wallets enable row level security;

-- No insert/update/delete policies: every write goes through the service
-- role in api/_handlers/crypto-wallet.js, which bypasses RLS entirely and
-- always scopes to the verified caller's own user_id. A user may still
-- read their own row directly (e.g. for future client-side display).
drop policy if exists "cdp_wallets_select_own" on public.cdp_wallets;
create policy "cdp_wallets_select_own" on public.cdp_wallets
  for select to authenticated using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- crypto_wallets is a separate, older, purely-simulated in-app crypto
-- ledger (deposit/withdraw/exchange/stake modals in src/components/wallet/)
-- with no connection to any real blockchain -- unrelated to cdp_wallets
-- above. Its select policy was "using (true)": any authenticated user
-- could read every other user's simulated balances and wallet address.
-- Every real caller already scopes its own queries by user_email, so
-- tightening this to owner-only changes nothing about how the app behaves.
-- -----------------------------------------------------------------------------
drop policy if exists "crypto_wallets_select_authenticated" on public.crypto_wallets;
drop policy if exists "crypto_wallets_select_own" on public.crypto_wallets;
create policy "crypto_wallets_select_own" on public.crypto_wallets
  for select to authenticated using (auth.email() = user_email);
