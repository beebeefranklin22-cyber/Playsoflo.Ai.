-- Artist Studio fixes: Fan Pools, Distribution, Royalty Splits, deal
-- applications, and Sync Licensing admin access -- all of these had a
-- schema mismatch (the real table was missing fields the UI actually
-- reads/writes, so the write silently failed) and/or a broken/fake
-- payment path.

-- ── fan_pools: FanPoolManager's create/edit form ───────────────────────────
alter table public.fan_pools add column if not exists title text;
alter table public.fan_pools add column if not exists description text;
alter table public.fan_pools add column if not exists pool_type text;
alter table public.fan_pools add column if not exists goal_amount numeric;
alter table public.fan_pools add column if not exists deadline timestamptz;
alter table public.fan_pools add column if not exists event_date timestamptz;
alter table public.fan_pools add column if not exists location text;
alter table public.fan_pools add column if not exists cover_image text;
alter table public.fan_pools add column if not exists video_url text;
alter table public.fan_pools add column if not exists add_ons jsonb;

-- ── music_distributions: DistributionManager's request form ────────────────
alter table public.music_distributions add column if not exists track_id uuid;
alter table public.music_distributions add column if not exists track_title text;
alter table public.music_distributions add column if not exists platforms jsonb;
alter table public.music_distributions add column if not exists distributor text;
alter table public.music_distributions add column if not exists distribution_fee numeric;
alter table public.music_distributions add column if not exists payment_method text;
alter table public.music_distributions add column if not exists payment_intent_id text;
alter table public.music_distributions add column if not exists release_date timestamptz;
alter table public.music_distributions add column if not exists notes text;

-- ── royalty_splits: real per-track split data + a real security fix ────────
-- Was using(true)/with check(true) on WRITE too -- any authenticated user
-- could edit any track's royalty splits, not just their own.
alter table public.royalty_splits add column if not exists splits jsonb;
alter table public.royalty_splits add column if not exists updated_by text;
alter table public.royalty_splits add column if not exists total_distributed numeric default 0;

drop policy if exists "royalty_splits_write_authenticated" on public.royalty_splits;

drop policy if exists "royalty_splits_insert_own" on public.royalty_splits;
create policy "royalty_splits_insert_own" on public.royalty_splits for insert to authenticated
  with check (exists (select 1 from public.music_tracks t where t.id = royalty_splits.track_id and t.artist_email = auth.email()));

drop policy if exists "royalty_splits_update_own" on public.royalty_splits;
create policy "royalty_splits_update_own" on public.royalty_splits for update to authenticated
  using (exists (select 1 from public.music_tracks t where t.id = royalty_splits.track_id and t.artist_email = auth.email()))
  with check (exists (select 1 from public.music_tracks t where t.id = royalty_splits.track_id and t.artist_email = auth.email()));

drop policy if exists "royalty_splits_delete_own" on public.royalty_splits;
create policy "royalty_splits_delete_own" on public.royalty_splits for delete to authenticated
  using (exists (select 1 from public.music_tracks t where t.id = royalty_splits.track_id and t.artist_email = auth.email()));

-- ── music_deal_applications: MusicStudio's applyForDealMutation ────────────
alter table public.music_deal_applications add column if not exists deal_type text;
alter table public.music_deal_applications add column if not exists instagram_handle text;
alter table public.music_deal_applications add column if not exists youtube_channel text;
alter table public.music_deal_applications add column if not exists monthly_listeners integer;
alter table public.music_deal_applications add column if not exists career_goals text;
alter table public.music_deal_applications add column if not exists additional_info text;

-- is_admin: SyncLicensingAdmin.jsx (and any future admin-only RLS bypass)
-- gates its UI on profiles.role = 'admin', but the query needs to be safe
-- to run inside a USING/WITH CHECK clause: STABLE + no dependency on the
-- calling role, since RLS evaluates it once per row check.
create or replace function public.is_admin(p_email text) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where email = p_email and role = 'admin');
$$;
revoke all on function public.is_admin(text) from public;
grant execute on function public.is_admin(text) to authenticated, anon;

-- ── sync_requests: brand/admin-facing licensing needs a real payment
-- path and an admin can currently only ever see/update their OWN requests
-- (sync_requests_update_own requires auth.email() = artist_email), so
-- SyncLicensingAdmin.jsx's status updates fail under RLS for anyone who
-- isn't literally the requesting artist.
alter table public.sync_requests add column if not exists brand_email text;
alter table public.sync_requests add column if not exists brand_name text;
alter table public.sync_requests add column if not exists project_title text;
alter table public.sync_requests add column if not exists project_type text;
alter table public.sync_requests add column if not exists usage_description text;
alter table public.sync_requests add column if not exists budget numeric;
alter table public.sync_requests add column if not exists license_fee numeric;
alter table public.sync_requests add column if not exists payment_method text;
alter table public.sync_requests add column if not exists payment_intent_id text;
alter table public.sync_requests add column if not exists track_id uuid;
alter table public.sync_requests add column if not exists track_title text;

drop policy if exists "sync_requests_select_authenticated" on public.sync_requests;
drop policy if exists "sync_requests_select_involved" on public.sync_requests;
create policy "sync_requests_select_involved" on public.sync_requests for select to authenticated
  using (auth.email() = artist_email or auth.email() = brand_email or public.is_admin(auth.email()));

drop policy if exists "sync_requests_insert_own" on public.sync_requests;
create policy "sync_requests_insert_own" on public.sync_requests for insert to authenticated
  with check (auth.email() = artist_email or auth.email() = brand_email);

drop policy if exists "sync_requests_update_own" on public.sync_requests;
create policy "sync_requests_update_own" on public.sync_requests for update to authenticated
  using (auth.email() = artist_email or auth.email() = brand_email or public.is_admin(auth.email()))
  with check (auth.email() = artist_email or auth.email() = brand_email or public.is_admin(auth.email()));
