-- AffiliateProgram.jsx has always advertised "Earn 5-10% tiered commission
-- ... instantly credited to your wallet," but nothing in the codebase ever
-- captured who referred a new signup, and nothing ever computed or paid a
-- commission on a purchase. This wires up the missing attribution +
-- crediting chain (checkout.js / cart-checkout.js do the actual crediting;
-- see those files).

alter table public.profiles add column if not exists referred_by_code text;
alter table public.profiles add column if not exists total_referral_earnings numeric not null default 0;

-- Extend the existing signup trigger (0003_checkout_tables.sql) to also
-- capture the referral code AuthContext.jsx's register() now passes in
-- auth.users' raw_user_meta_data (set by ReferralCapture.jsx from a
-- referral link's ?ref= param). This is the only point in the whole
-- lifecycle where that handoff is possible, since the trigger only sees
-- what's already in auth.users at insert time.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, referred_by_code)
  values (new.id, new.email, new.raw_user_meta_data->>'referral_code')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- affiliate_referrals had "for all using(true) with check(true)" --  any
-- signed-in user could insert fabricated referral/commission rows crediting
-- themselves, independent of whether real money ever moved. Real commission
-- rows are now written exclusively by checkout.js/cart-checkout.js under
-- the service role (alongside the actual wallet credit), so authenticated
-- users only need read access to referrals where they're the affiliate or
-- the referred user -- no direct write access at all.
drop policy if exists "affiliate_referrals_write_authenticated" on public.affiliate_referrals;
drop policy if exists "affiliate_referrals_select_authenticated" on public.affiliate_referrals;
create policy "affiliate_referrals_select_own" on public.affiliate_referrals
  for select to authenticated
  using (
    referred_user_email = auth.email()
    or referral_code = (select referral_code from public.profiles where id = auth.uid())
  );
revoke insert, update, delete on public.affiliate_referrals from authenticated, anon;

-- Atomic increment for the affiliate's running earnings total (a plain
-- read-then-write from application code would race under concurrent
-- referred purchases and under-count). Used by
-- api/_lib/orderHelpers.js's creditAffiliateCommission.
create or replace function public.increment_referral_earnings(p_email text, p_amount numeric) returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set total_referral_earnings = total_referral_earnings + p_amount where email = p_email;
$$;

revoke all on function public.increment_referral_earnings(text, numeric) from public, anon, authenticated;
grant execute on function public.increment_referral_earnings(text, numeric) to service_role;
