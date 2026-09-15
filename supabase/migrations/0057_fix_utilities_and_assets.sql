-- bill_payments, utility_accounts, and assets are all reachable through the
-- routed Utilities page (src/pages/Utilities.jsx -- registered in
-- src/pages.config.js, so it's live at /Utilities regardless of whether a
-- nav link points at it) but their schemas were never built past
-- id/timestamps, while the page has always written real fields to them.
-- Every "Save Account"/"Save Asset" click has therefore always failed
-- outright at the database level (unknown column), and the bill-payment
-- feature additionally called a payUtilityBill server function that was
-- never implemented, so "Pay $X" always failed too -- this table trio
-- and its one page are fixed together.
alter table public.utility_accounts
  add column if not exists user_email text,
  add column if not exists provider_name text,
  add column if not exists service_name text,
  add column if not exists account_type text,
  add column if not exists account_number text,
  add column if not exists address text,
  add column if not exists amount_due numeric default 0,
  add column if not exists next_due_date timestamptz,
  add column if not exists auto_pay_enabled boolean default false,
  add column if not exists auto_pay_method text,
  add column if not exists is_recurring boolean default true,
  add column if not exists recurrence_interval text;

alter table public.assets
  add column if not exists user_email text,
  add column if not exists asset_type text,
  add column if not exists name text,
  add column if not exists value_usd numeric,
  add column if not exists image_url text;

alter table public.bill_payments
  add column if not exists utility_account_id uuid references public.utility_accounts(id) on delete cascade,
  add column if not exists user_email text,
  add column if not exists amount numeric,
  add column if not exists payment_date timestamptz default now(),
  add column if not exists status text default 'completed',
  add column if not exists is_automatic boolean default false,
  add column if not exists confirmation_number text,
  add column if not exists payment_method text default 'wallet_balance';

drop policy if exists "utility_accounts_select_authenticated" on public.utility_accounts;
drop policy if exists "utility_accounts_write_authenticated" on public.utility_accounts;
create policy "utility_accounts_all_own" on public.utility_accounts
  for all to authenticated
  using (auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or public.is_admin(auth.email()));

drop policy if exists "assets_select_authenticated" on public.assets;
drop policy if exists "assets_write_authenticated" on public.assets;
create policy "assets_all_own" on public.assets
  for all to authenticated
  using (auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or public.is_admin(auth.email()));

drop policy if exists "bill_payments_select_authenticated" on public.bill_payments;
drop policy if exists "bill_payments_write_authenticated" on public.bill_payments;
create policy "bill_payments_all_own" on public.bill_payments
  for all to authenticated
  using (auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or public.is_admin(auth.email()));

create index if not exists idx_utility_accounts_user_email on public.utility_accounts(user_email);
create index if not exists idx_bill_payments_user_email on public.bill_payments(user_email);
create index if not exists idx_bill_payments_utility_account_id on public.bill_payments(utility_account_id);
