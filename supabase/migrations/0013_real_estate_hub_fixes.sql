-- Real Estate Hub audit fixes. The `properties` table had essentially no
-- listing columns (id/created_by/rating/reviews_count only), so every
-- listing create/update from ListPropertyModal/QuickEditPropertyModal/
-- BulkPropertyUpload was rejected outright by PostgREST — nothing about a
-- property ever actually persisted. Add every field those forms (and the
-- display/map/filter code that reads them) already assume exists.
alter table public.properties add column if not exists title text;
alter table public.properties add column if not exists description text;
alter table public.properties add column if not exists property_type text;
alter table public.properties add column if not exists listing_type text;
alter table public.properties add column if not exists location text;
alter table public.properties add column if not exists address text;
alter table public.properties add column if not exists city text;
alter table public.properties add column if not exists state text;
alter table public.properties add column if not exists zip_code text;
alter table public.properties add column if not exists county text;
alter table public.properties add column if not exists latitude double precision;
alter table public.properties add column if not exists longitude double precision;
alter table public.properties add column if not exists bedrooms integer;
alter table public.properties add column if not exists bathrooms numeric;
alter table public.properties add column if not exists square_feet integer;
alter table public.properties add column if not exists year_built integer;
alter table public.properties add column if not exists zoning text;
alter table public.properties add column if not exists price_per_night numeric;
alter table public.properties add column if not exists price_per_month numeric;
alter table public.properties add column if not exists sale_price numeric;
alter table public.properties add column if not exists price_in_soflo numeric;
alter table public.properties add column if not exists main_image text;
alter table public.properties add column if not exists images jsonb default '[]'::jsonb;
alter table public.properties add column if not exists amenities jsonb default '[]'::jsonb;
alter table public.properties add column if not exists floor_plan_url text;
alter table public.properties add column if not exists walkthrough_video_url text;
alter table public.properties add column if not exists virtual_tour_url text;
alter table public.properties add column if not exists host_name text;
alter table public.properties add column if not exists host_email text;
alter table public.properties add column if not exists verified_host boolean default false;
alter table public.properties add column if not exists instant_book boolean default false;
alter table public.properties add column if not exists security_deposit_months numeric;
alter table public.properties add column if not exists move_in_fee numeric;
alter table public.properties add column if not exists minimum_stay integer default 1;
alter table public.properties add column if not exists cancellation_policy text default 'moderate';
alter table public.properties add column if not exists data_source text;

-- RealEstate.jsx calls Property.list() unconditionally, with no login
-- gate, so guests browsing without an account got zero rows (only
-- `authenticated` had a grant/policy) while any signed-in user could see
-- every listing. Let logged-out browsing work like a normal listings site.
grant select on public.properties to anon;
drop policy if exists "properties_select_anon" on public.properties;
create policy "properties_select_anon" on public.properties for select to anon using (true);

-- ── property_bookings: payment + refund tracking columns ──────────────────
alter table public.property_bookings add column if not exists platform_fee numeric;
alter table public.property_bookings add column if not exists host_earnings numeric;
alter table public.property_bookings add column if not exists payment_method text;
alter table public.property_bookings add column if not exists payment_intent_id text;
alter table public.property_bookings add column if not exists guest_name text;
alter table public.property_bookings add column if not exists refund_amount numeric;
alter table public.property_bookings add column if not exists cancelled_by text;
alter table public.property_bookings add column if not exists cancellation_reason text;
alter table public.property_bookings add column if not exists cancelled_at timestamptz;

-- property_bookings_select_authenticated was `using (true)` — any signed-in
-- user could read every booking's ID documents, selfies, and emails, not
-- just their own as guest or host. Scope it.
drop policy if exists "property_bookings_select_authenticated" on public.property_bookings;
drop policy if exists "property_bookings_select_involved" on public.property_bookings;
create policy "property_bookings_select_involved" on public.property_bookings
  for select to authenticated
  using (auth.email() = host_email or auth.email() = guest_email);

-- property_bookings_update_own only allowed host_email — but a guest needs
-- to update their own booking too (uploading ID docs, self-cancelling).
drop policy if exists "property_bookings_update_own" on public.property_bookings;
drop policy if exists "property_bookings_update_involved" on public.property_bookings;
create policy "property_bookings_update_involved" on public.property_bookings
  for update to authenticated
  using (auth.email() = host_email or auth.email() = guest_email)
  with check (auth.email() = host_email or auth.email() = guest_email);

-- Prevent double-booking: no two active bookings for the same property may
-- have overlapping date ranges. Declined/cancelled bookings don't hold
-- dates. Requires btree_gist for the equality operator class alongside the
-- range overlap operator in one exclusion constraint.
--
-- check_in_date/check_out_date were timestamptz, but a GiST exclusion
-- constraint needs an expression Postgres can prove IMMUTABLE, and casting
-- timestamptz -> date is only STABLE (it depends on the session timezone).
-- These columns represent whole calendar days anyway (a check-in DATE, not
-- a specific instant), so converting them to `date` is both the more
-- correct type and what makes the constraint expressible at all. Existing
-- ISO datetime strings cast to `date` cleanly (Postgres takes the date
-- portion), and the app already only ever displays/compares the date part.
alter table public.property_bookings alter column check_in_date type date using check_in_date::date;
alter table public.property_bookings alter column check_out_date type date using check_out_date::date;

create extension if not exists btree_gist;

alter table public.property_bookings drop constraint if exists property_bookings_no_overlap;
alter table public.property_bookings
  add constraint property_bookings_no_overlap
  exclude using gist (
    property_id with =,
    daterange(check_in_date, check_out_date, '[)') with &&
  )
  where (status in ('pending_review', 'approved_awaiting_payment', 'confirmed'));

alter table public.property_bookings drop constraint if exists property_bookings_dates_valid;
alter table public.property_bookings
  add constraint property_bookings_dates_valid
  check (check_in_date is null or check_out_date is null or check_out_date > check_in_date);

-- ── chat_conversations / chat_messages: were readable/writable by anyone ──
-- chat_conversations_select_authenticated was `using (true)` — every
-- authenticated user could list every conversation in the app (Messages.jsx
-- fetches with no filter, trusting RLS to scope it — it didn't). Scope to
-- participants, mirroring the participant-scoped UPDATE policy already
-- fixed in 0007_social_hub_fixes.sql.
drop policy if exists "chat_conversations_select_authenticated" on public.chat_conversations;
drop policy if exists "chat_conversations_select_participant" on public.chat_conversations;
create policy "chat_conversations_select_participant" on public.chat_conversations
  for select to authenticated
  using (auth.email() = created_by or participants @> to_jsonb(auth.email()));

-- chat_messages was wide open in both directions: `for select using (true)`
-- and `for all using (true) with check (true)` — any authenticated user
-- could read, edit, or delete any private message in the app, not just
-- their own conversations. Scope every action to "you're a participant in
-- the parent conversation."
drop policy if exists "chat_messages_select_authenticated" on public.chat_messages;
drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and (c.created_by = auth.email() or c.participants @> to_jsonb(auth.email()))
    )
  );

drop policy if exists "chat_messages_write_authenticated" on public.chat_messages;
drop policy if exists "chat_messages_insert_participant" on public.chat_messages;
create policy "chat_messages_insert_participant" on public.chat_messages
  for insert to authenticated
  with check (
    auth.email() = sender_email
    and exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and (c.created_by = auth.email() or c.participants @> to_jsonb(auth.email()))
    )
  );

drop policy if exists "chat_messages_update_participant" on public.chat_messages;
create policy "chat_messages_update_participant" on public.chat_messages
  for update to authenticated
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and (c.created_by = auth.email() or c.participants @> to_jsonb(auth.email()))
    )
  )
  with check (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and (c.created_by = auth.email() or c.participants @> to_jsonb(auth.email()))
    )
  );

drop policy if exists "chat_messages_delete_participant" on public.chat_messages;
create policy "chat_messages_delete_participant" on public.chat_messages
  for delete to authenticated
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and (c.created_by = auth.email() or c.participants @> to_jsonb(auth.email()))
    )
  );
