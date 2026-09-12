-- Entertainment Hub audit fixes.
--
-- 1) MONEY-LOSS BUG (highest priority): entertainment_tickets had no
--    experience_id column at all (and was missing ~10 other columns
--    TicketPurchaseModal.jsx wrote), so every ticket/pass purchase charged
--    the buyer first (Stripe or wallet) and then threw on the insert —
--    money moved, no ticket, no automatic refund. TicketPurchaseModal.jsx
--    is rewritten to go through api/checkout.js (the same
--    money-moves-before-the-order-row-exists flow every other order type
--    already uses) with a new 'entertainment_ticket' order_type, so this
--    migration adds every column that flow (api/_lib/orderHelpers.js) and
--    the ticket display/redemption UI (MyTickets.jsx,
--    TicketRedemptionScanner.jsx, VoidPassModal.jsx) actually need.
--
-- 2) `experiences` had only 14 columns total, none of the fields
--    ListExperienceModal.jsx's multi-step form actually collects (photos,
--    venue, tickets, passes, policies, ...) — every "list your experience"
--    submission was rejected outright by PostgREST. Add them all.

-- ── entertainment_tickets: the actual money-loss fix ───────────────────────
alter table public.entertainment_tickets add column if not exists experience_id uuid;
alter table public.entertainment_tickets add column if not exists experience_title text;
alter table public.entertainment_tickets add column if not exists buyer_name text;
alter table public.entertainment_tickets add column if not exists batch_id text;
alter table public.entertainment_tickets add column if not exists qr_code text;
alter table public.entertainment_tickets add column if not exists security_hash text;
alter table public.entertainment_tickets add column if not exists access_code text;
alter table public.entertainment_tickets add column if not exists quantity integer default 1;
alter table public.entertainment_tickets add column if not exists venue_name text;
alter table public.entertainment_tickets add column if not exists venue_address text;

create index if not exists entertainment_tickets_experience_id_idx on public.entertainment_tickets (experience_id);

-- pass_visits_allowed was `boolean` but every write path (old client code,
-- and the new server-side createOrderRow) sets it to a visit count like 999
-- — inserting a number into a boolean column fails outright. pass_perks was
-- `text` but the app has only ever written an array to it. This table has
-- never successfully accepted a single row (every insert failed on the
-- missing experience_id above), so there is no existing data to worry
-- about converting.
alter table public.entertainment_tickets alter column pass_visits_allowed type integer using (case when pass_visits_allowed then 1 else 0 end);
alter table public.entertainment_tickets alter column pass_perks type jsonb using (case when pass_perks is null then null else to_jsonb(pass_perks) end);

-- entertainment_tickets_write_authenticated (0001) let any authenticated
-- user insert/update/delete ANY ticket row `using (true) with check (true)`
-- — including fabricating a fully "confirmed" free ticket with no payment,
-- or marking someone else's ticket redeemed/refunded. Now that tickets are
-- created server-side (service role, which bypasses RLS entirely) via
-- api/checkout.js, authenticated clients no longer need INSERT at all;
-- UPDATE is only ever done by the provider (TicketRedemptionScanner
-- redeeming, VoidPassModal voiding), and SELECT only by the buyer or the
-- provider whose experience it's for — both already denormalized directly
-- onto this table, no join needed.
drop policy if exists "entertainment_tickets_select_authenticated" on public.entertainment_tickets;
drop policy if exists "entertainment_tickets_select_involved" on public.entertainment_tickets;
create policy "entertainment_tickets_select_involved" on public.entertainment_tickets for select to authenticated
  using (auth.email() = buyer_email or auth.email() = provider_email);

drop policy if exists "entertainment_tickets_write_authenticated" on public.entertainment_tickets;

drop policy if exists "entertainment_tickets_update_provider" on public.entertainment_tickets;
create policy "entertainment_tickets_update_provider" on public.entertainment_tickets for update to authenticated
  using (auth.email() = provider_email)
  with check (auth.email() = provider_email);

-- ── experiences: listing fields ListExperienceModal.jsx actually collects ─
alter table public.experiences add column if not exists description text;
alter table public.experiences add column if not exists provider_name text;
alter table public.experiences add column if not exists provider_phone text;
alter table public.experiences add column if not exists image_url text;
alter table public.experiences add column if not exists gallery_images jsonb default '[]'::jsonb;
alter table public.experiences add column if not exists venue_name text;
alter table public.experiences add column if not exists venue_address text;
alter table public.experiences add column if not exists venue_city text;
alter table public.experiences add column if not exists venue_state text;
alter table public.experiences add column if not exists venue_zipcode text;
-- Populated only if a future geocoding pass is added — no ListExperienceModal
-- field captures these yet (no maps/geocoding API key configured anywhere in
-- this codebase; ListPropertyModal.jsx has the same gap for `properties`).
-- The column exists now so EntertainmentExperiences.jsx's radius filter has
-- somewhere to read coordinates from once it is.
alter table public.experiences add column if not exists venue_latitude double precision;
alter table public.experiences add column if not exists venue_longitude double precision;
alter table public.experiences add column if not exists requires_tickets boolean default false;
alter table public.experiences add column if not exists ticket_types jsonb default '[]'::jsonb;
alter table public.experiences add column if not exists total_capacity integer;
alter table public.experiences add column if not exists availability_type text;
alter table public.experiences add column if not exists event_dates jsonb default '[]'::jsonb;
alter table public.experiences add column if not exists duration_minutes integer;
alter table public.experiences add column if not exists cancellation_policy text;
alter table public.experiences add column if not exists refund_policy text;
alter table public.experiences add column if not exists age_restriction text;
alter table public.experiences add column if not exists dress_code text;
alter table public.experiences add column if not exists included_amenities jsonb default '[]'::jsonb;
alter table public.experiences add column if not exists special_requirements text;
alter table public.experiences add column if not exists pricing_tiers jsonb default '[]'::jsonb;
alter table public.experiences add column if not exists pass_types jsonb default '[]'::jsonb;
alter table public.experiences add column if not exists batch_prefix text;
alter table public.experiences add column if not exists current_batch_number integer default 0;

-- ListExperienceModal.jsx never sets is_active, but ProviderStorefront.jsx
-- filters experiences with `is_active: true` — without this default every
-- newly listed experience would be invisible on the provider's own
-- storefront.
alter table public.experiences alter column is_active set default true;

-- experiences_select_authenticated (0001) only granted `authenticated` —
-- EntertainmentExperiences.jsx loads listings unconditionally, even for
-- signed-out visitors, so guests always saw an empty page (same class of
-- bug fixed for `properties` in 0013_real_estate_hub_fixes.sql).
grant select on public.experiences to anon;
drop policy if exists "experiences_select_anon" on public.experiences;
create policy "experiences_select_anon" on public.experiences for select to anon using (true);

-- experiences_write_authenticated (0001) was `using (true) with check
-- (true)` — any authenticated user could edit or delete any provider's
-- listing (price, title, provider_email, ...). ListExperienceModal.jsx
-- always writes provider_email = the creating user, and
-- CalendarSyncManager.jsx only ever updates its own experience, so scoping
-- to "you own this row" costs nothing real.
drop policy if exists "experiences_write_authenticated" on public.experiences;

drop policy if exists "experiences_insert_own" on public.experiences;
create policy "experiences_insert_own" on public.experiences for insert to authenticated
  with check (auth.email() = provider_email);

drop policy if exists "experiences_update_own" on public.experiences;
create policy "experiences_update_own" on public.experiences for update to authenticated
  using (auth.email() = provider_email)
  with check (auth.email() = provider_email);

drop policy if exists "experiences_delete_own" on public.experiences;
create policy "experiences_delete_own" on public.experiences for delete to authenticated
  using (auth.email() = provider_email);
