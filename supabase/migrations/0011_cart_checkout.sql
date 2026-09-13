-- The `carts` table only ever got item_id/quantity/user_email in the
-- baseline schema, but Cart.jsx (and the (previously unused) AddToCartButton)
-- read/write item_type, item_name, item_image, price, notes, and
-- provider_email — none of which existed, so every real cart row would have
-- failed to round-trip correctly. Add the missing columns.
alter table public.carts add column if not exists item_type text;
alter table public.carts add column if not exists item_name text;
alter table public.carts add column if not exists item_image text;
alter table public.carts add column if not exists price numeric;
alter table public.carts add column if not exists notes text;
alter table public.carts add column if not exists provider_email text;

-- carts previously had `for select to authenticated using (true)` — any
-- logged-in user could read every other user's cart contents. Scope it to
-- the owner, matching insert/update/delete (already correctly scoped).
drop policy if exists "carts_select_authenticated" on public.carts;
drop policy if exists "carts_select_own" on public.carts;
create policy "carts_select_own" on public.carts for select to authenticated using (auth.email() = user_email);

-- Same bug, same fix, on the separate food-delivery cart table (FoodCart.jsx
-- also queried this with no user_email filter client-side — fixed alongside
-- this migration — but the RLS policy needs fixing regardless since it's
-- the actual enforcement boundary).
drop policy if exists "cart_items_select_authenticated" on public.cart_items;
drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own" on public.cart_items for select to authenticated using (auth.email() = user_email);

-- ── wallet_checkout_multi(): atomic multi-provider cart checkout ──────────
-- A shopping cart can contain items from several different providers in one
-- purchase. wallet_move() only handles a single customer->recipient pair per
-- call, which isn't safe to call once per cart line when paying from the
-- SoFlo wallet: if the customer's balance ran out partway through a
-- multi-call loop, earlier lines would already have moved money while later
-- ones failed, leaving a half-charged cart. This locks the customer's
-- balance once, verifies it covers every line's debit up front, then debits
-- the total and credits each provider — all inside one transaction, so it
-- either fully applies or fully rolls back.
--
-- p_lines shape: jsonb array of
--   { "to_email": text, "debit_amount": numeric, "credit_amount": numeric,
--     "reference_type": text, "reference_id": text, "memo": text }
create or replace function public.wallet_checkout_multi(
  p_from_email text,
  p_lines jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_id uuid;
  v_from_balance numeric;
  v_to_id uuid;
  v_total numeric;
  v_line jsonb;
begin
  if p_from_email is null then
    raise exception 'p_from_email is required';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'p_lines must be a non-empty array';
  end if;

  select id, usd_balance into v_from_id, v_from_balance
  from public.profiles
  where email = p_from_email
  for update;

  if v_from_id is null then
    raise exception 'customer profile not found for %', p_from_email;
  end if;

  select sum((elem->>'debit_amount')::numeric) into v_total
  from jsonb_array_elements(p_lines) as elem;

  if v_total is null or v_total <= 0 then
    raise exception 'total debit amount must be positive';
  end if;

  if v_from_balance < v_total then
    raise exception 'insufficient balance';
  end if;

  update public.profiles
  set usd_balance = usd_balance - v_total, updated_at = now()
  where id = v_from_id;

  -- Lock provider rows in a stable order (sorted by email) so two concurrent
  -- multi-provider checkouts can never deadlock against each other.
  for v_line in select elem from jsonb_array_elements(p_lines) as elem order by (elem->>'to_email')
  loop
    insert into public.wallet_transactions (user_email, counterparty_email, amount, direction, reference_type, reference_id, memo)
    values (p_from_email, v_line->>'to_email', (v_line->>'debit_amount')::numeric, 'debit', v_line->>'reference_type', v_line->>'reference_id', v_line->>'memo');

    if (v_line->>'to_email') is not null and (v_line->>'credit_amount') is not null and (v_line->>'credit_amount')::numeric > 0 then
      select id into v_to_id from public.profiles where email = v_line->>'to_email' for update;
      if v_to_id is null then
        raise exception 'recipient profile not found for %', v_line->>'to_email';
      end if;

      update public.profiles
      set usd_balance = usd_balance + (v_line->>'credit_amount')::numeric, updated_at = now()
      where id = v_to_id;

      insert into public.wallet_transactions (user_email, counterparty_email, amount, direction, reference_type, reference_id, memo)
      values (v_line->>'to_email', p_from_email, (v_line->>'credit_amount')::numeric, 'credit', v_line->>'reference_type', v_line->>'reference_id', v_line->>'memo');
    end if;
  end loop;

  return jsonb_build_object('success', true, 'new_balance', v_from_balance - v_total, 'total_charged', v_total);
end;
$$;

-- Same lockdown as wallet_move: security definer bypasses RLS, so only the
-- server (service_role, via api/cart-checkout.js) may call this.
revoke all on function public.wallet_checkout_multi(text, jsonb) from public;
revoke all on function public.wallet_checkout_multi(text, jsonb) from anon;
revoke all on function public.wallet_checkout_multi(text, jsonb) from authenticated;
grant execute on function public.wallet_checkout_multi(text, jsonb) to service_role;
