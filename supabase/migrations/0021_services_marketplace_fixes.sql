-- Services Marketplace hub audit fixes (photographers, DJs, barbers,
-- landscapers, tutors, fitness instructors, consultants, etc).

-- ── marketplace_items: fields the three listing-creation forms already
-- send but which don't exist yet ───────────────────────────────────────────
-- ProviderListings.jsx / ProviderHub.jsx / BusinessHubProviderSection.jsx
-- all send `response_time`; ProviderHub's "create service" form (and the
-- shared RentalCalendar it wires up for rental categories) sends
-- `blocked_dates` -- rental_details/portfolio_images/add_ons/variations
-- were already added by 0016_car_rental_hub_fixes.sql, but blocked_dates
-- and response_time were missed.
alter table public.marketplace_items add column if not exists blocked_dates jsonb default '[]'::jsonb;
alter table public.marketplace_items add column if not exists response_time text;

-- ProviderOnboardingFlow.jsx's "Create Your First Listing" step collects a
-- `duration` (minutes) per service template/custom entry but never sent it
-- to MarketplaceItem.create() -- there was no column to receive it, so it
-- was silently dropped even though the working onboarding form built it.
alter table public.marketplace_items add column if not exists duration numeric;

-- Minimal "add a video" support alongside the existing image_url/
-- portfolio_images, per the ask for providers to attach pictures *and*
-- videos to a listing.
alter table public.marketplace_items add column if not exists video_url text;

-- Real lat/lng so the marketplace radius filter (ServiceProviders.jsx) can
-- actually compute distance instead of being decorative. Captured
-- best-effort via browser geolocation at listing-creation time.
alter table public.marketplace_items add column if not exists latitude double precision;
alter table public.marketplace_items add column if not exists longitude double precision;

-- package_details was `text` but ServicePackageManager.jsx has always
-- written/read a plain JS object through it (`package_details: { is_package:
-- true, included_service_ids: [...], ... }` on write, `.package_details?.
-- is_package` on read). PostgREST happily stores whatever JSON value it's
-- given in a text column as that value's textual form, so writes never
-- errored -- but reading it back gives a plain string, not an object, so
-- every `.is_package` / `.included_services` access silently evaluated to
-- undefined app-wide. Making the column real jsonb fixes both directions:
-- supabase-js hands back a parsed object automatically, no manual
-- JSON.parse/stringify needed (there wasn't any to remove).
--
-- Existing values might not be valid JSON at all (package_details predates
-- the packages feature and may hold arbitrary text on old rows), so a bare
-- `::jsonb` cast could abort the whole migration on one bad row. Use a
-- small helper that catches the cast failure per-row and falls back to
-- null, mirroring the to_jsonb() safety net 0016 used for
-- damage_settlements.ai_analysis (that trick doesn't apply here because
-- to_jsonb(text) always wraps as a JSON *string* scalar rather than
-- parsing it, which would leave every legit package object as a string).
create or replace function public._safe_text_to_jsonb(val text) returns jsonb
language plpgsql immutable as $$
begin
  if val is null or btrim(val) = '' then
    return null;
  end if;
  return val::jsonb;
exception when others then
  return null;
end;
$$;

alter table public.marketplace_items
  alter column package_details type jsonb using public._safe_text_to_jsonb(package_details);

drop function public._safe_text_to_jsonb(text);

-- ── provider_availabilities: the table only ever had day_of_week +
-- provider_email, but every reader (BookingModal, UnifiedBookingModal,
-- CustomerBookingCalendar, ProviderHub's own "Set Your Availability" tab)
-- expects is_available/start_time/end_time, and UnifiedBookingModal also
-- reads slot_duration_minutes (which ProviderHub's availability tab already
-- writes). Availability has been 100% non-functional -- add the columns
-- so it actually works.
alter table public.provider_availabilities add column if not exists is_available boolean default true;
alter table public.provider_availabilities add column if not exists start_time time;
alter table public.provider_availabilities add column if not exists end_time time;
alter table public.provider_availabilities add column if not exists slot_duration_minutes integer default 60;

-- ── provider_verifications: submission forms (ProviderHub.jsx,
-- BusinessHubProviderSection.jsx) send license_number/issuing_authority/
-- issue_date/expiration_date/document_urls (plural) and ProviderHub also
-- reads back verification.rejection_reason -- none of these columns
-- existed, so every verification submission has been silently dropping
-- this data (only verification_type/provider_email actually landed) and
-- no rejection reason could ever be stored/shown.
alter table public.provider_verifications add column if not exists license_number text;
alter table public.provider_verifications add column if not exists issuing_authority text;
alter table public.provider_verifications add column if not exists issue_date date;
alter table public.provider_verifications add column if not exists expiration_date date;
alter table public.provider_verifications add column if not exists document_urls jsonb default '[]'::jsonb;
alter table public.provider_verifications add column if not exists rejection_reason text;

-- Admin approve/reject: provider_verifications_update_own (0001) only ever
-- let the provider themselves update their own row, so there was no way
-- for an admin to flip status to verified/rejected even once an admin UI
-- existed. Extend it with the same public.is_admin() escape hatch used for
-- sync_requests in 0017.
drop policy if exists "provider_verifications_update_own" on public.provider_verifications;
create policy "provider_verifications_update_own" on public.provider_verifications
  for update to authenticated
  using (auth.email() = provider_email or public.is_admin(auth.email()))
  with check (auth.email() = provider_email or public.is_admin(auth.email()));

-- ── service_bookings: real double-booking prevention ───────────────────────
-- 0003_checkout_tables.sql *tried* to change booking_date to `date` via
-- `add column if not exists booking_date date`, but that column already
-- existed (as timestamptz, from 0001) -- "add column if not exists" is a
-- no-op against an existing column, so it silently never changed the type.
-- Actually do the conversion here, the same way 0013/0018 converted
-- property_bookings/car_rentals' date columns: casting timestamptz->date is
-- only STABLE (session-timezone dependent), but the app only ever writes
-- whole calendar days into booking_date (an <input type="date"> value), so
-- no real information is lost, and it's what makes an IMMUTABLE exclusion
-- constraint expression possible below.
alter table public.service_bookings alter column booking_date type date using booking_date::date;

-- booking_time is `text` ("HH:MM") and duration_hours is nullable numeric,
-- so build the actual booked window as `booking_date + <time-of-day>`
-- through `+ duration (default 1h if unset)`. Note: `booking_time::time`
-- (a plain cast, going through time_in) is only STABLE, not IMMUTABLE --
-- Postgres won't accept it in an index/exclusion-constraint expression --
-- so the time-of-day is built from make_time()/split_part() instead, which
-- are real IMMUTABLE functions doing the same parsing by hand. The
-- date+time addition and interval multiplication are immutable too, so the
-- whole expression is legal in a GiST exclusion constraint.
--
-- Only rows with a parseable "HH:MM" booking_time are covered by the
-- partial WHERE predicate -- any legacy row with garbage/missing
-- booking_time is simply excluded from the constraint's index (and from
-- protection) rather than aborting this migration.
create extension if not exists btree_gist;

alter table public.service_bookings drop constraint if exists service_bookings_no_overlap;
alter table public.service_bookings
  add constraint service_bookings_no_overlap
  exclude using gist (
    provider_email with =,
    tsrange(
      (booking_date + make_time(split_part(booking_time, ':', 1)::int, split_part(booking_time, ':', 2)::int, 0)),
      (booking_date + make_time(split_part(booking_time, ':', 1)::int, split_part(booking_time, ':', 2)::int, 0))
        + (coalesce(duration_hours, 1) * interval '1 hour'),
      '[)'
    ) with &&
  )
  where (
    status in ('pending', 'confirmed')
    and provider_email is not null
    and booking_date is not null
    and booking_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
  );
