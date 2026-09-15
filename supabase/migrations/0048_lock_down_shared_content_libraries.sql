-- SharedLibraryManager.jsx (CreatorHub.jsx's "Shared Content Libraries")
-- has always been completely broken, not just insecure: it creates a
-- library with {name, description, co_owners, revenue_split}, but this
-- table only ever had id/created_at/updated_at/created_date/
-- content_ids/revenue_split -- name, description, and co_owners never
-- existed as columns at all, so every createLibraryMutation call has
-- always failed outright (with no onError handler to surface it), and
-- library.co_owners.length in the render path throws for any row that
-- somehow exists. Adding the missing columns is what actually makes
-- this feature work; shared_content_libraries_write_authenticated was
-- also "using(true)/with check(true)" -- wide open for a table that (once
-- it works) holds real membership and revenue-split data, so any signed-in
-- user could read, join, or rewrite anyone's library and payout split.
alter table public.shared_content_libraries add column if not exists name text;
alter table public.shared_content_libraries add column if not exists description text;
alter table public.shared_content_libraries add column if not exists co_owners jsonb not null default '[]'::jsonb;

drop policy if exists "shared_content_libraries_select_authenticated" on public.shared_content_libraries;
drop policy if exists "shared_content_libraries_write_authenticated" on public.shared_content_libraries;

create policy "shared_content_libraries_select_members" on public.shared_content_libraries
  for select to authenticated
  using (co_owners @> to_jsonb(auth.email()) or public.is_admin(auth.email()));

create policy "shared_content_libraries_insert_own" on public.shared_content_libraries
  for insert to authenticated
  with check (co_owners @> to_jsonb(auth.email()));

create policy "shared_content_libraries_update_members" on public.shared_content_libraries
  for update to authenticated
  using (co_owners @> to_jsonb(auth.email()) or public.is_admin(auth.email()))
  with check (co_owners @> to_jsonb(auth.email()) or public.is_admin(auth.email()));

create policy "shared_content_libraries_delete_members" on public.shared_content_libraries
  for delete to authenticated
  using (co_owners @> to_jsonb(auth.email()) or public.is_admin(auth.email()));
