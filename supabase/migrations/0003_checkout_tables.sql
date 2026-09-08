-- Supports api/checkout.js (processUnifiedCheckout). Idempotent, safe to
-- run alongside 0001/0002 in any order.

-- ── keep profiles.email populated from auth.users ──────────────────────────
-- wallet_move() (0002) looks users up by profiles.email — if a profile row
-- was created without it (e.g. an older signup path that only set id), that
-- lookup silently fails. Backfill once, then keep it filled going forward.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create or replace function public.set_profile_email() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.email is null then
    select email into NEW.email from auth.users where id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists set_profile_email_trg on public.profiles;
create trigger set_profile_email_trg
before insert on public.profiles
for each row execute function public.set_profile_email();

-- ── CRITICAL: create a profiles row on signup ──────────────────────────────
-- src/api/entities.js's UserEntity.me() does
-- `.from('profiles').select('*').eq('id', ...).single()` and silently
-- returns null on any error (including "no row found") instead of
-- throwing — and updateMyProfile() only ever UPDATEs, never inserts. Put
-- those together and a brand-new signup (a real row in auth.users) never
-- gets a matching profiles row through any code path in this app, so
-- currentUser is null forever and the account is unusable. This is the
-- standard Supabase pattern for exactly this problem: auto-create the
-- profile the moment the auth user is created.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill: any auth user who signed up before this trigger existed and
-- still has no profiles row.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ── wallet_move: allow a pure credit with no debit side ────────────────────
-- Needed when a customer pays by card (Stripe) rather than their SoFlo
-- wallet: nobody's internal balance is debited, but the provider's earnings
-- still need to land in their wallet. p_from_email = null means "skip the
-- debit side entirely".
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
  if p_from_email is not null then
    if p_debit_amount is null or p_debit_amount <= 0 then
      raise exception 'debit amount must be positive';
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
  end if;

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

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.wallet_move(text, text, numeric, numeric, text, text, text) from public;
revoke all on function public.wallet_move(text, text, numeric, numeric, text, text, text) from anon;
revoke all on function public.wallet_move(text, text, numeric, numeric, text, text, text) from authenticated;
grant execute on function public.wallet_move(text, text, numeric, numeric, text, text, text) to service_role;

-- ── order/booking tables checkout writes into, keyed by order_type ────────
create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.service_bookings add column if not exists customer_email text;
alter table public.service_bookings add column if not exists provider_email text;
alter table public.service_bookings add column if not exists service_id text;
alter table public.service_bookings add column if not exists service_title text;
alter table public.service_bookings add column if not exists booking_type text default 'service_booking';
alter table public.service_bookings add column if not exists booking_date date;
alter table public.service_bookings add column if not exists booking_time text;
alter table public.service_bookings add column if not exists location text;
alter table public.service_bookings add column if not exists total_price numeric;
alter table public.service_bookings add column if not exists platform_fee numeric;
alter table public.service_bookings add column if not exists provider_earnings numeric;
alter table public.service_bookings add column if not exists status text default 'confirmed';
alter table public.service_bookings add column if not exists payment_method text;
alter table public.service_bookings add column if not exists payment_intent_id text;
alter table public.service_bookings add column if not exists special_requirements text;
alter table public.service_bookings add column if not exists quantity integer default 1;
alter table public.service_bookings add column if not exists review_submitted boolean default false;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists provider_email text;
alter table public.orders add column if not exists item_id text;
alter table public.orders add column if not exists item_title text;
alter table public.orders add column if not exists quantity integer default 1;
alter table public.orders add column if not exists subtotal numeric;
alter table public.orders add column if not exists platform_fee numeric;
alter table public.orders add column if not exists provider_earnings numeric;
alter table public.orders add column if not exists total_amount numeric;
alter table public.orders add column if not exists status text default 'confirmed';
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_intent_id text;
alter table public.orders add column if not exists fulfillment_method text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists shipping_address text;
alter table public.orders add column if not exists customer_notes text;
alter table public.orders add column if not exists customer_phone text;

create table if not exists public.food_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.food_orders add column if not exists customer_email text;
alter table public.food_orders add column if not exists provider_email text;
alter table public.food_orders add column if not exists item_id text;
alter table public.food_orders add column if not exists item_title text;
alter table public.food_orders add column if not exists quantity integer default 1;
alter table public.food_orders add column if not exists subtotal numeric;
alter table public.food_orders add column if not exists platform_fee numeric;
alter table public.food_orders add column if not exists provider_earnings numeric;
alter table public.food_orders add column if not exists total_amount numeric;
alter table public.food_orders add column if not exists status text default 'confirmed';
alter table public.food_orders add column if not exists payment_method text;
alter table public.food_orders add column if not exists payment_intent_id text;
alter table public.food_orders add column if not exists delivery_address text;
alter table public.food_orders add column if not exists customer_notes text;
alter table public.food_orders add column if not exists customer_phone text;
alter table public.food_orders add column if not exists driver_email text;
alter table public.food_orders add column if not exists delivery_coords jsonb;
alter table public.food_orders add column if not exists delivery_order_id uuid;

create table if not exists public.content_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_purchases add column if not exists content_id text;
alter table public.content_purchases add column if not exists buyer_email text;
alter table public.content_purchases add column if not exists creator_email text;
alter table public.content_purchases add column if not exists amount_usd numeric;
alter table public.content_purchases add column if not exists purchase_type text default 'buy';
alter table public.content_purchases add column if not exists payment_method text;
alter table public.content_purchases add column if not exists payment_intent_id text;
alter table public.content_purchases add column if not exists access_expires_at timestamptz;
alter table public.content_purchases add column if not exists platform_fee numeric;
alter table public.content_purchases add column if not exists creator_earnings numeric;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions add column if not exists customer_email text;
alter table public.subscriptions add column if not exists provider_email text;
alter table public.subscriptions add column if not exists item_id text;
alter table public.subscriptions add column if not exists item_title text;
alter table public.subscriptions add column if not exists interval text default 'monthly';
alter table public.subscriptions add column if not exists amount numeric;
alter table public.subscriptions add column if not exists platform_fee numeric;
alter table public.subscriptions add column if not exists provider_earnings numeric;
alter table public.subscriptions add column if not exists status text default 'active';
alter table public.subscriptions add column if not exists payment_method text;
alter table public.subscriptions add column if not exists payment_intent_id text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;

-- RLS: customer or provider on the row can read it; writes go through
-- api/checkout.js (service role) only, so there is deliberately no
-- authenticated insert/update policy on these tables.
do $$
declare
  t text;
begin
  foreach t in array array['service_bookings', 'orders', 'food_orders', 'subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_select_involved" on public.%1$I', t);
    execute format(
      'create policy "%1$s_select_involved" on public.%1$I for select using (auth.email() = customer_email or auth.email() = provider_email)',
      t
    );
  end loop;
end $$;

alter table public.content_purchases enable row level security;
drop policy if exists "content_purchases_select_involved" on public.content_purchases;
create policy "content_purchases_select_involved" on public.content_purchases
  for select using (auth.email() = buyer_email or auth.email() = creator_email);
