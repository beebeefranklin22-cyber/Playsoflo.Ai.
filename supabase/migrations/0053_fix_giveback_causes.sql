-- GiveBack (donations table, used as "causes") has always been completely
-- broken, not just insecure: CreateCauseModal.jsx creates/updates a cause
-- with {title, cause_type, description, story, goal_usd, image_url,
-- photos, location, contact_email, website, long_term_initiative,
-- community_owned, beneficiary_count, creator_email, creator_name,
-- is_active}, but this table only ever had id/created_at/updated_at/
-- created_date/raised_usd -- none of those fields existed as columns, so
-- creating or editing a cause has always failed outright. Adding the
-- missing columns is what actually makes this feature work; the table's
-- write policy was also "using(true)/with check(true)" -- wide open for a
-- table that, once it works, holds a creator's real cause listing.
alter table public.donations add column if not exists title text;
alter table public.donations add column if not exists cause_type text;
alter table public.donations add column if not exists description text;
alter table public.donations add column if not exists story text;
alter table public.donations add column if not exists goal_usd numeric;
alter table public.donations add column if not exists image_url text;
alter table public.donations add column if not exists photos jsonb;
alter table public.donations add column if not exists location text;
alter table public.donations add column if not exists contact_email text;
alter table public.donations add column if not exists website text;
alter table public.donations add column if not exists long_term_initiative boolean not null default false;
alter table public.donations add column if not exists community_owned boolean not null default false;
alter table public.donations add column if not exists beneficiary_count numeric;
alter table public.donations add column if not exists creator_email text;
alter table public.donations add column if not exists creator_name text;
alter table public.donations add column if not exists is_active boolean not null default true;

drop policy if exists "donations_select_authenticated" on public.donations;
create policy "donations_select_authenticated" on public.donations for select to authenticated using (true);

drop policy if exists "donations_write_authenticated" on public.donations;

create policy "donations_insert_own" on public.donations
  for insert to authenticated
  with check (auth.email() = creator_email);

create policy "donations_update_own" on public.donations
  for update to authenticated
  using (auth.email() = creator_email or public.is_admin(auth.email()))
  with check (auth.email() = creator_email or public.is_admin(auth.email()));

create policy "donations_delete_own" on public.donations
  for delete to authenticated
  using (auth.email() = creator_email or public.is_admin(auth.email()));

-- CauseDetailModal.jsx's donate flow used to read-then-write
-- raised_usd = (cause.raised_usd || 0) + amount directly from the client
-- -- besides being blocked by the RLS lockdown above (a donor isn't the
-- cause's creator), a read-then-write from the client also loses
-- donations under concurrent contributions to the same popular cause. A
-- narrow SECURITY DEFINER RPC (same shape as recompute_property_rating,
-- 0047) does the increment as a single atomic UPDATE and validates the
-- amount server-side, without granting general write access to the cause.
create or replace function public.increment_cause_raised(p_cause_id uuid, p_amount numeric) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid donation amount';
  end if;

  update public.donations set raised_usd = coalesce(raised_usd, 0) + p_amount where id = p_cause_id;
end;
$$;

revoke all on function public.increment_cause_raised(uuid, numeric) from public;
revoke all on function public.increment_cause_raised(uuid, numeric) from anon;
grant execute on function public.increment_cause_raised(uuid, numeric) to authenticated;
