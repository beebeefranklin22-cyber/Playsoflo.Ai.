-- Health & Wellness Hub audit fixes.
--
-- 1) marketplace_items: WellnessProviderOnboardingModal's publish payload
--    sends response_time, portfolio_images, and add_ons on every submit --
--    none of these were real columns, and src/api/entities.js's generic
--    Entity.create() does a raw `.insert()` with no field filtering, so
--    Postgres rejected the ENTIRE row and "List My Service" always failed
--    (the onboarding modal separately marked the provider onboarded
--    regardless of that failure -- fixed in
--    WellnessProviderOnboardingModal.jsx to only do that after the listing
--    actually saves). Also add a real `duration_minutes` (no duration field
--    existed anywhere for a wellness service), a structured `location_type`
--    (in_person / mobile / virtual -- location was previously freeform text
--    only), an optional `virtual_meeting_note` for the virtual case,
--    `price_in_soflo` (already read by Wellness.jsx's card display but never
--    had a backing column), and latitude/longitude so the location radius
--    filter (fixed in Wellness.jsx) has real coordinates to compute
--    distance from -- matching the same column names already used on
--    `properties` (see 0013_real_estate_hub_fixes.sql).
alter table public.marketplace_items add column if not exists response_time text;
alter table public.marketplace_items add column if not exists portfolio_images jsonb default '[]'::jsonb;
alter table public.marketplace_items add column if not exists add_ons jsonb default '[]'::jsonb;
alter table public.marketplace_items add column if not exists duration_minutes integer;
alter table public.marketplace_items add column if not exists location_type text default 'in_person';
alter table public.marketplace_items add column if not exists virtual_meeting_note text;
alter table public.marketplace_items add column if not exists price_in_soflo numeric;
alter table public.marketplace_items add column if not exists latitude double precision;
alter table public.marketplace_items add column if not exists longitude double precision;

-- 2) provider_availabilities had only day_of_week/provider_email -- no
--    actual availability window existed for ANY provider type, so
--    UnifiedBookingModal's slot computation (reads is_available/start_time/
--    end_time/slot_duration_minutes -- see loadAvailableSlots in
--    src/components/booking/UnifiedBookingModal.jsx) and the generic
--    availability editor that already exists in
--    src/components/profile/BusinessHubProviderSection.jsx and
--    src/pages/ProviderHub.jsx (both already write these exact field names
--    from a day-of-week + time-range form) silently did nothing. This table
--    is shared, provider-type-agnostic infrastructure, not a wellness-only
--    concept, so wellness providers get real scheduling for free through the
--    same generic Profile > Business > Services availability tab every
--    other provider type already uses -- add the columns those existing
--    call sites are already trying to read/write.
alter table public.provider_availabilities add column if not exists is_available boolean default true;
alter table public.provider_availabilities add column if not exists start_time time;
alter table public.provider_availabilities add column if not exists end_time time;
alter table public.provider_availabilities add column if not exists slot_duration_minutes integer default 60;

-- 3) provider_verifications only had (document_url, provider_email, status,
--    verification_type) -- but the wellness onboarding modal's verification
--    step (and the generic verification form in
--    BusinessHubProviderSection.jsx, used by every provider type) submits
--    license_number/issuing_authority/issue_date/expiration_date/
--    document_urls on every submit. None of those were real columns, so
--    every verification submission failed outright (same
--    Entity.create()-has-no-field-filtering root cause as the listing bug
--    above) -- meaning a wellness provider's real license data never
--    actually reached provider_verifications at all, which is *why* the "N
--    License(s)" badge on Wellness.jsx could never render even after fixing
--    the key it reads by (provider_email vs created_by, fixed in
--    Wellness.jsx): there was never a row to read. document_urls (plural,
--    jsonb) is additive alongside the existing document_url (singular) --
--    neither is dropped.
alter table public.provider_verifications add column if not exists license_number text;
alter table public.provider_verifications add column if not exists issuing_authority text;
alter table public.provider_verifications add column if not exists issue_date date;
alter table public.provider_verifications add column if not exists expiration_date date;
alter table public.provider_verifications add column if not exists document_urls jsonb default '[]'::jsonb;
