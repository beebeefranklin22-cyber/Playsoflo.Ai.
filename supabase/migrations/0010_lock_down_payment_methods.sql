-- payment_cards and payment_methods previously had `for select to authenticated
-- using (true)` — any logged-in user could read every other user's saved
-- payment method rows (bank/card last4, crypto wallet addresses, external
-- account identifiers). Scope SELECT to the owning user, matching the
-- insert/update/delete policies already in place on these tables.

drop policy if exists "payment_cards_select_authenticated" on public.payment_cards;
drop policy if exists "payment_cards_select_own" on public.payment_cards;
create policy "payment_cards_select_own" on public.payment_cards for select to authenticated using (auth.email() = user_email);

drop policy if exists "payment_methods_select_authenticated" on public.payment_methods;
drop policy if exists "payment_methods_select_own" on public.payment_methods;
create policy "payment_methods_select_own" on public.payment_methods for select to authenticated using (auth.email() = user_email);
