-- =============================================================================
-- Playsoflo.Ai — Baseline schema (defensive, idempotent)
-- =============================================================================
--
-- WHY THIS FILE EXISTS
-- This app was migrated from Base44 (a no-code platform) to Supabase, but the
-- Postgres schema itself was never committed anywhere. We do not know with any
-- certainty what tables/columns exist (if any) in the live Supabase project.
--
-- This migration was NOT written from a certified schema. It was reverse-
-- engineered by statically reading src/api/entities.js (the thin Supabase
-- wrapper every table goes through) and every call site across src/ that
-- creates, updates, filters, or lists rows through it (mostly via
-- base44.entities.<Name>.* / base44.asServiceRole.entities.<Name>.*, see
-- src/api/base44Client.js). Every table name, and every column referenced in
-- an object literal passed to .create()/.update() or used as a .filter()/
-- .list() key, is included. Column types are inferred from naming
-- conventions and, where ambiguous, from how the value is actually used in
-- the UI (see the judgment calls below). Treat this as a functional-recovery
-- baseline, not a certified/authoritative schema.
--
-- SAFETY / IDEMPOTENCY
-- Every statement is guarded so this file can be run any number of times,
-- against an empty database, a partially-populated one, or one that already
-- has some of these tables with real rows in a different shape:
--   * CREATE TABLE IF NOT EXISTS for every table (never DROP/CREATE bare).
--   * ALTER TABLE ... ADD COLUMN IF NOT EXISTS for every column, run even on
--     a table that CREATE TABLE IF NOT EXISTS just no-op'd on, so existing
--     tables get any columns they're missing without touching existing data.
--   * RLS policies are dropped and recreated by name (DROP POLICY IF EXISTS
--     + CREATE POLICY) so re-running never fails on a duplicate policy name.
--   * No column is ever dropped, renamed, or retyped, and no row is touched.
--
-- NOTABLE JUDGMENT CALLS (see also inline comments near each case)
--   * created_date: ~75 call sites across the app order lists by
--     '-created_date' (a Base44 naming leftover), while the Entity class in
--     entities.js only ever writes created_at/updated_at on insert/update.
--     Every table therefore gets BOTH created_at and created_date (both
--     default now()), so those `.order('created_date', ...)` calls don't
--     fail with a missing-column error. created_at remains the canonical
--     timestamp; created_date is a same-instant mirror maintained only via
--     its own DEFAULT (nothing ever updates it after insert, matching how
--     the app itself treats created_at).
--   * profiles: given a primary key of auth.users(id), plus every field read
--     or written through User/UserEntity (src/api/entities.js),
--     AuthContext.jsx and updateMe/updateMyProfile/updateProfile call sites.
--     AuthContext.fetchUserProfile() tolerates a missing row (it catches the
--     .single() error and falls back to {id, email} only), so login itself
--     will not break without a trigger. However, UserEntity.updateMyProfile
--     / AuthContext.updateProfile do `.update(...).eq('id', ...).single()`
--     with no prior insert path, which throws ("no rows") the first time a
--     brand-new user edits their profile if no row exists yet. A trigger on
--     auth.users insert is therefore added below to create the matching
--     profiles row, which is the standard Supabase pattern and the safer
--     choice functionally, at the cost of assuming this trigger doesn't
--     already exist elsewhere (it's created with OR REPLACE / IF NOT EXISTS
--     guards, so it's safe even if one does).
--   * RLS is intentionally permissive: SELECT is open to any authenticated
--     user for every table (this is a browsable marketplace/social app —
--     bookings, wallets, DMs and other genuinely private tables are the
--     exception and are called out inline). Write access is scoped to an
--     obvious single owner column where exactly one exists (a `user_id`/
--     `owner_id` uuid, or a single `*_email`/`created_by`/`email` column).
--     Where a table has multiple plausible owner columns (e.g. a booking
--     with both a customer and a provider) or none at all (pure lookup/
--     reference tables), write access is left permissive to any
--     authenticated user rather than guessed at — this is a functional-
--     recovery migration, not a security hardening pass. Each such table is
--     marked with a one-line comment so it can be tightened later.
--
-- HOW TO RUN
-- Paste into the Supabase SQL editor and run once, or `supabase db push`.
-- Safe to re-run after edits to this file or against a DB that already ran
-- an earlier version of it.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- profiles
-- Keyed by id = auth.users(id) (see UserEntity in src/api/entities.js: .me()
-- selects profiles by the auth session's user id and merges in id/email from
-- the session). Columns below come from every base44.auth.updateMe/
-- updateMyProfile/updateProfile(...) payload and every currentUser.<field>
-- read found across src/.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- ad_campaigns
-- -----------------------------------------------------------------------------
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  advertiser_email text,
  ai_optimized boolean,
  budget_amount numeric,
  headline text,
  schedule jsonb,
  status text
);

-- -----------------------------------------------------------------------------
-- affiliate_listings
-- -----------------------------------------------------------------------------
create table if not exists public.affiliate_listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  benefits jsonb,
  clicks integer,
  likes jsonb,
  poster_email text,
  poster_name text,
  poster_photo text,
  rating numeric,
  requirements jsonb,
  review_count integer,
  status text
);

-- -----------------------------------------------------------------------------
-- affiliate_referrals
-- -----------------------------------------------------------------------------
create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  affiliate_program text,
  created_by text,
  is_sub_affiliate boolean,
  parent_affiliate_code text,
  referral_code text,
  referred_user_email text,
  status text
);

-- -----------------------------------------------------------------------------
-- affiliate_reviews
-- -----------------------------------------------------------------------------
create table if not exists public.affiliate_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  helpful_count integer,
  listing_id uuid
);

-- -----------------------------------------------------------------------------
-- ai_recommendations
-- -----------------------------------------------------------------------------
create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- ai_tools
-- -----------------------------------------------------------------------------
create table if not exists public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- amazon_orders
-- -----------------------------------------------------------------------------
create table if not exists public.amazon_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  price numeric,
  user_email text
);

-- -----------------------------------------------------------------------------
-- assets
-- -----------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- bank_accounts
-- -----------------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  account_holder_name text,
  account_number_last4 text,
  account_type text,
  bank_name text,
  is_primary boolean,
  is_verified boolean,
  routing_number text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- bill_payments
-- -----------------------------------------------------------------------------
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- blocks
-- -----------------------------------------------------------------------------
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  blocked_email text,
  blocked_name text,
  blocker_email text,
  blocker_name text
);

-- -----------------------------------------------------------------------------
-- bookings
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  booking_date timestamptz,
  booking_status text,
  booking_type text,
  cancellation_fee numeric,
  cancellation_reason text,
  cancelled_at timestamptz,
  confirmation_code text,
  created_by text,
  experience_id uuid,
  experience_title text,
  host_email text,
  number_of_guests integer,
  payment_method text,
  payment_status text,
  provider_email text,
  special_requests text,
  status text,
  total_price_usd numeric
);

-- -----------------------------------------------------------------------------
-- campaign_backers
-- -----------------------------------------------------------------------------
create table if not exists public.campaign_backers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  backer_email text,
  campaign_id uuid,
  message text,
  payment_status text,
  reward_tier_id uuid
);

-- -----------------------------------------------------------------------------
-- car_rentals
-- -----------------------------------------------------------------------------
create table if not exists public.car_rentals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  car_make text,
  car_model text,
  conversation_id uuid,
  doc_rejection_reason text,
  doc_verification_status text,
  doc_verified_at timestamptz,
  doc_verified_by text,
  drivers_license_back_url text,
  drivers_license_url text,
  insurance_card_url text,
  license_expiry_date timestamptz,
  license_number text,
  provider_email text,
  renter_email text,
  start_date timestamptz,
  status text,
  total_amount numeric
);

-- -----------------------------------------------------------------------------
-- cart_items
-- -----------------------------------------------------------------------------
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  menu_item_id uuid,
  menu_item_name text,
  menu_item_price numeric,
  quantity integer,
  restaurant_id uuid,
  user_email text
);

-- -----------------------------------------------------------------------------
-- carts
-- -----------------------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  item_id uuid,
  quantity integer,
  user_email text
);

-- -----------------------------------------------------------------------------
-- challenges
-- -----------------------------------------------------------------------------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  is_active boolean,
  start_date timestamptz,
  total_videos integer
);

-- -----------------------------------------------------------------------------
-- chat_conversations
-- -----------------------------------------------------------------------------
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  booking_id uuid,
  context_id uuid,
  context_type text,
  created_by text,
  is_group boolean,
  last_message text,
  last_message_at timestamptz,
  last_message_sender text,
  last_message_time timestamptz,
  muted_by jsonb,
  name text,
  participant_emails jsonb,
  participant_names jsonb,
  participants jsonb,
  pinned_by jsonb,
  provider_name text,
  reference_id uuid,
  ride_id uuid,
  service_id uuid,
  service_title text,
  title text,
  type text,
  unread_count integer
);

-- -----------------------------------------------------------------------------
-- chat_messages
-- -----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  attachment_url text,
  content text,
  conversation_id uuid,
  deleted_at timestamptz,
  delivered_to jsonb,
  edited_at timestamptz,
  is_deleted boolean,
  is_edited boolean,
  is_read boolean,
  message text,
  message_type text,
  reactions jsonb,
  read boolean,
  read_by jsonb,
  receiver_email text,
  sender_email text,
  sender_name text,
  sender_photo text,
  translation_data jsonb,
  type text
);

-- -----------------------------------------------------------------------------
-- co_stream_participants
-- -----------------------------------------------------------------------------
create table if not exists public.co_stream_participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  can_broadcast text,
  can_moderate text,
  invited_by text,
  joined_at timestamptz,
  participant_email text,
  status text,
  stream_id uuid
);

-- -----------------------------------------------------------------------------
-- collaborations
-- -----------------------------------------------------------------------------
create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  initiator_email text,
  status text
);

-- -----------------------------------------------------------------------------
-- collaborative_documents
-- -----------------------------------------------------------------------------
create table if not exists public.collaborative_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content text,
  last_edited_at timestamptz,
  last_edited_by text,
  share_expires_at timestamptz,
  share_token text,
  version text
);

-- -----------------------------------------------------------------------------
-- collaborative_videos
-- -----------------------------------------------------------------------------
create table if not exists public.collaborative_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  comments integer,
  status text
);

-- -----------------------------------------------------------------------------
-- comments
-- -----------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  author_avatar text,
  author_email text,
  author_name text,
  author_photo text,
  content text,
  liked_by jsonb,
  likes_count integer,
  parent_comment_id uuid,
  post_id uuid,
  post_type text,
  reply_to_name text,
  user_email text,
  user_name text,
  user_photo text
);

-- -----------------------------------------------------------------------------
-- content_analytics
-- -----------------------------------------------------------------------------
create table if not exists public.content_analytics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text
);

-- -----------------------------------------------------------------------------
-- content_edits
-- -----------------------------------------------------------------------------
create table if not exists public.content_edits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  editor_email text,
  editor_name text,
  reviewed_by text,
  status text
);

-- -----------------------------------------------------------------------------
-- content_purchases
-- -----------------------------------------------------------------------------
create table if not exists public.content_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  access_expires_at timestamptz,
  amount_paid numeric,
  amount_usd numeric,
  buyer_email text,
  content_id uuid,
  content_type text,
  creator_earnings numeric,
  creator_email text,
  item_id uuid,
  item_type text,
  payment_intent_id text,
  payment_method text,
  platform_fee numeric,
  price_paid numeric,
  product_id uuid,
  purchase_type text,
  seller_email text
);

-- -----------------------------------------------------------------------------
-- creator_memberships
-- -----------------------------------------------------------------------------
create table if not exists public.creator_memberships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text
);

-- -----------------------------------------------------------------------------
-- creator_metrics
-- -----------------------------------------------------------------------------
create table if not exists public.creator_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text
);

-- -----------------------------------------------------------------------------
-- creator_products
-- -----------------------------------------------------------------------------
create table if not exists public.creator_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  clicks integer,
  created_by text,
  creator_email text,
  is_active boolean,
  is_featured boolean,
  product_type text,
  purchases integer,
  sales_count integer,
  stream_id uuid,
  type text
);

-- -----------------------------------------------------------------------------
-- creator_subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount_usd numeric,
  billing_period text,
  creator_email text,
  is_active boolean,
  monthly_amount_usd numeric,
  started_at timestamptz,
  status text,
  subscriber_count integer,
  subscriber_email text,
  subscriber_name text,
  tier_id uuid,
  tier_name text
);

-- -----------------------------------------------------------------------------
-- crowdfunding_campaigns
-- -----------------------------------------------------------------------------
create table if not exists public.crowdfunding_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  backers_count integer,
  creator_email text,
  current_amount numeric,
  status text
);

-- -----------------------------------------------------------------------------
-- crypto_rewards
-- -----------------------------------------------------------------------------
create table if not exists public.crypto_rewards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  distributed_at timestamptz,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- crypto_transactions
-- -----------------------------------------------------------------------------
create table if not exists public.crypto_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  blockchain_tx_hash text,
  currency text,
  exchange_rate numeric,
  fee numeric,
  from_amount numeric,
  from_currency text,
  memo text,
  recipient_address text,
  status text,
  to_amount numeric,
  to_currency text,
  transaction_type text,
  usd_value numeric,
  user_email text
);

-- -----------------------------------------------------------------------------
-- crypto_wallets
-- -----------------------------------------------------------------------------
create table if not exists public.crypto_wallets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  balance numeric,
  currency text,
  is_active boolean,
  user_email text,
  wallet_address text
);

-- -----------------------------------------------------------------------------
-- damage_settlements
-- -----------------------------------------------------------------------------
create table if not exists public.damage_settlements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  owner_email text,
  owner_response text,
  resolved_at timestamptz,
  settlement_amount numeric,
  status text
);

-- -----------------------------------------------------------------------------
-- defi_positions
-- -----------------------------------------------------------------------------
create table if not exists public.defi_positions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- delivery_franchises
-- -----------------------------------------------------------------------------
create table if not exists public.delivery_franchises (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  owner_email text
);

-- -----------------------------------------------------------------------------
-- delivery_orders
-- -----------------------------------------------------------------------------
create table if not exists public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  conversation_id uuid,
  driver_email text,
  rating numeric,
  recipient_email text,
  review text,
  review_time timestamptz,
  sender_email text,
  status text,
  tracking_updates jsonb
);

-- -----------------------------------------------------------------------------
-- delivery_vehicles
-- -----------------------------------------------------------------------------
create table if not exists public.delivery_vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  driver_email text,
  is_active boolean
);

-- -----------------------------------------------------------------------------
-- digital_products
-- -----------------------------------------------------------------------------
create table if not exists public.digital_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  created_by text,
  creator_email text,
  creator_name text,
  is_active boolean,
  rating numeric,
  revenue numeric,
  sales_count integer,
  total_sales integer
);

-- -----------------------------------------------------------------------------
-- direct_messages
-- -----------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content text,
  conversation_id uuid,
  is_deleted boolean,
  is_edited boolean,
  reactions jsonb,
  read boolean,
  read_at timestamptz,
  recipient_email text,
  reference_id uuid,
  reference_type text,
  sender_email text,
  sender_name text,
  sender_photo text
);

-- -----------------------------------------------------------------------------
-- disputes
-- -----------------------------------------------------------------------------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  ai_analysis jsonb,
  amount_disputed numeric,
  complainant_email text,
  description text,
  dispute_type text,
  disputer_email text,
  disputer_type text,
  escalation_type text,
  evidence_urls jsonb,
  initiator_email text,
  initiator_name text,
  lease_id uuid,
  property_id uuid,
  reason text,
  reference_id uuid,
  reference_type text,
  resolution text,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by text,
  respondent_email text,
  respondent_name text,
  severity text,
  status text
);

-- -----------------------------------------------------------------------------
-- document_comments
-- -----------------------------------------------------------------------------
create table if not exists public.document_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  document_id uuid,
  is_resolved boolean,
  resolved_at timestamptz,
  resolved_by text
);

-- -----------------------------------------------------------------------------
-- document_presences
-- -----------------------------------------------------------------------------
create table if not exists public.document_presences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  document_id uuid,
  is_editing boolean,
  user_email text
);

-- -----------------------------------------------------------------------------
-- donations
-- -----------------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  raised_usd numeric
);

-- -----------------------------------------------------------------------------
-- driver_ratings
-- -----------------------------------------------------------------------------
create table if not exists public.driver_ratings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  categories jsonb,
  driver_email text,
  passenger_email text,
  passenger_name text,
  passenger_photo text,
  rating numeric,
  review_text text,
  ride_id uuid,
  would_ride_again text
);

-- -----------------------------------------------------------------------------
-- driver_stats
-- -----------------------------------------------------------------------------
create table if not exists public.driver_stats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  cancellation_rate numeric,
  cancellations integer,
  driver_email text,
  pending_payout numeric,
  period_date timestamptz,
  period_type text
);

-- -----------------------------------------------------------------------------
-- entertainment_tickets
-- -----------------------------------------------------------------------------
create table if not exists public.entertainment_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  buyer_email text,
  event_date timestamptz,
  event_time text,
  is_pass boolean,
  pass_perks text,
  pass_type text,
  pass_valid_from text,
  pass_valid_until text,
  pass_visits_allowed boolean,
  pass_visits_used integer,
  price_paid numeric,
  provider_email text,
  redeemed_at timestamptz,
  redeemed_by text,
  redemption_history jsonb,
  refund_amount numeric,
  special_instructions text,
  status text,
  ticket_number text,
  ticket_type text,
  verification_timestamp timestamptz
);

-- -----------------------------------------------------------------------------
-- error_logs
-- -----------------------------------------------------------------------------
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  component_stack text,
  error_message text,
  error_stack text,
  error_type text,
  resolved boolean,
  url text,
  user_agent text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- escrow_transactions
-- -----------------------------------------------------------------------------
create table if not exists public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  capacity text,
  comments_count integer,
  liked_by jsonb,
  likes_count integer,
  organizer_email text,
  organizer_name text,
  organizer_photo text,
  saved_by jsonb,
  saves_count integer,
  shares_count integer,
  status text,
  tags jsonb,
  ticket_price numeric,
  views integer
);

-- -----------------------------------------------------------------------------
-- experiences
-- -----------------------------------------------------------------------------
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  booking_date timestamptz,
  calendar_sync_enabled boolean,
  category text,
  customer_email text,
  google_calendar_id text,
  is_active boolean,
  price numeric,
  provider_email text,
  status text,
  title text
);

-- -----------------------------------------------------------------------------
-- failed_payments
-- -----------------------------------------------------------------------------
create table if not exists public.failed_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- fan_pools
-- -----------------------------------------------------------------------------
create table if not exists public.fan_pools (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  artist_email text,
  artist_name text,
  contributors jsonb,
  raised_amount numeric,
  status text,
  tier_rewards jsonb
);

-- -----------------------------------------------------------------------------
-- follow_requests
-- -----------------------------------------------------------------------------
create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  from_email text,
  from_name text,
  from_photo text,
  status text,
  to_email text
);

-- -----------------------------------------------------------------------------
-- follows
-- -----------------------------------------------------------------------------
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  follower_email text,
  follower_name text,
  following_email text,
  following_name text
);

-- -----------------------------------------------------------------------------
-- food_orders
-- -----------------------------------------------------------------------------
create table if not exists public.food_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  commission_amount numeric,
  created_by text,
  delivery_address text,
  delivery_fee numeric,
  driver_earnings numeric,
  driver_email text,
  driver_name text,
  estimated_delivery_time timestamptz,
  items integer,
  owner_email text,
  payment_settled boolean,
  restaurant_address text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_owner_email text,
  restaurant_phone text,
  special_instructions text,
  status text,
  subtotal numeric,
  total numeric,
  total_amount numeric,
  user_email text
);

-- -----------------------------------------------------------------------------
-- forum_groups
-- -----------------------------------------------------------------------------
create table if not exists public.forum_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  creator_name text,
  is_active boolean,
  member_count integer,
  members jsonb,
  rules text,
  thread_count integer
);

-- -----------------------------------------------------------------------------
-- forum_likes
-- -----------------------------------------------------------------------------
create table if not exists public.forum_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- forum_posts
-- -----------------------------------------------------------------------------
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- forum_replies
-- -----------------------------------------------------------------------------
create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content text,
  likes jsonb,
  thread_id uuid,
  user_email text,
  user_name text,
  user_photo text
);

-- -----------------------------------------------------------------------------
-- forum_threads
-- -----------------------------------------------------------------------------
create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  author_email text,
  author_name text,
  author_photo text,
  followers jsonb,
  group_id uuid,
  group_name text,
  last_reply_at timestamptz,
  last_reply_by text,
  likes jsonb,
  reply_count integer
);

-- -----------------------------------------------------------------------------
-- friend_requests
-- -----------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  from_email text,
  from_name text,
  message text,
  status text,
  to_email text
);

-- -----------------------------------------------------------------------------
-- friendships
-- -----------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  status text,
  user1_email text,
  user2_email text
);

-- -----------------------------------------------------------------------------
-- game_items
-- -----------------------------------------------------------------------------
create table if not exists public.game_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  game_name text,
  is_active boolean
);

-- -----------------------------------------------------------------------------
-- game_premium_subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.game_premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  benefits jsonb,
  end_date timestamptz,
  is_active boolean,
  price_paid numeric,
  start_date timestamptz,
  subscription_tier text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- game_scores
-- -----------------------------------------------------------------------------
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  duration_seconds integer,
  game_name text,
  level_reached integer,
  reward_earned numeric,
  score numeric,
  user_email text
);

-- -----------------------------------------------------------------------------
-- game_sessions
-- -----------------------------------------------------------------------------
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  game_name text,
  host_email text,
  max_players integer,
  players jsonb,
  status text
);

-- -----------------------------------------------------------------------------
-- help_guides
-- -----------------------------------------------------------------------------
create table if not exists public.help_guides (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- inventory_products
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  base_price numeric,
  category text,
  cost_price numeric,
  description text,
  last_restocked_at timestamptz,
  low_stock_threshold integer,
  name text,
  owner_email text,
  reorder_quantity integer,
  sku text,
  status text,
  stock_quantity integer,
  store_type text,
  supplier_contact text,
  supplier_name text,
  tags jsonb,
  track_inventory boolean,
  variants jsonb
);

-- -----------------------------------------------------------------------------
-- job_applications
-- -----------------------------------------------------------------------------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  applied_date timestamptz,
  company_name text,
  job_category text,
  job_id uuid,
  job_location text,
  job_title text,
  job_type text,
  pay_rate numeric,
  poster_photo text,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- job_gigs
-- -----------------------------------------------------------------------------
create table if not exists public.job_gigs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  benefits jsonb,
  poster_email text,
  poster_name text,
  poster_photo text,
  requirements jsonb,
  status text
);

-- -----------------------------------------------------------------------------
-- lease_applications
-- -----------------------------------------------------------------------------
create table if not exists public.lease_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  applicant_email text,
  applicant_name text,
  credit_score integer,
  current_address text,
  employer_name text,
  employment_status text,
  has_pets boolean,
  landlord_notes text,
  monthly_income numeric,
  move_in_date timestamptz,
  num_occupants integer,
  pet_details text,
  phone text,
  property_address text,
  property_id uuid,
  status text
);

-- -----------------------------------------------------------------------------
-- lease_documents
-- -----------------------------------------------------------------------------
create table if not exists public.lease_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  document_name text,
  document_type text,
  document_url text,
  file_size integer,
  lease_id uuid,
  notes text,
  property_id uuid
);

-- -----------------------------------------------------------------------------
-- leases
-- -----------------------------------------------------------------------------
create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  application_id uuid,
  grace_period_days integer,
  landlord_email text,
  landlord_name text,
  landlord_signed boolean,
  late_fee_amount numeric,
  late_fee_max numeric,
  late_fee_type text,
  lease_end_date timestamptz,
  lease_start_date timestamptz,
  lease_term_months integer,
  monthly_rent numeric,
  move_in_fee numeric,
  pet_deposit numeric,
  pets_allowed boolean,
  property_address text,
  property_id uuid,
  rent_due_day integer,
  security_deposit numeric,
  status text,
  tenant_email text,
  tenant_name text,
  tenant_signed boolean,
  terms text
);

-- -----------------------------------------------------------------------------
-- listening_histories
-- -----------------------------------------------------------------------------
create table if not exists public.listening_histories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  artist_name text,
  cover_art_url text,
  genre text,
  played_at timestamptz,
  source text,
  track_id uuid,
  track_title text,
  user_email text,
  video_id uuid
);

-- -----------------------------------------------------------------------------
-- livestream_chat_messages
-- -----------------------------------------------------------------------------
create table if not exists public.livestream_chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  is_priority boolean,
  message text,
  stream_id uuid,
  user_email text,
  user_name text
);

-- -----------------------------------------------------------------------------
-- livestream_chats
-- -----------------------------------------------------------------------------
create table if not exists public.livestream_chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  badge_color text,
  is_deleted boolean,
  is_pinned boolean,
  is_priority boolean,
  message text,
  stream_id uuid,
  user_badge text,
  user_email text,
  user_name text,
  user_profile_picture text
);

-- -----------------------------------------------------------------------------
-- livestream_polls
-- -----------------------------------------------------------------------------
create table if not exists public.livestream_polls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  ends_at timestamptz,
  options jsonb,
  status text,
  stream_id uuid
);

-- -----------------------------------------------------------------------------
-- livestream_pricing_tiers
-- -----------------------------------------------------------------------------
create table if not exists public.livestream_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  current_purchases integer,
  stream_id uuid
);

-- -----------------------------------------------------------------------------
-- livestream_reactions
-- -----------------------------------------------------------------------------
create table if not exists public.livestream_reactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  reaction_type text,
  stream_id uuid,
  user_email text
);

-- -----------------------------------------------------------------------------
-- livestream_schedules
-- -----------------------------------------------------------------------------
create table if not exists public.livestream_schedules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  access_type text,
  category text,
  creator_email text,
  description text,
  duration_minutes integer,
  is_recurring boolean,
  member_discount_percent numeric,
  ppv_price_usd numeric,
  recurrence_end_date timestamptz,
  recurrence_pattern text,
  scheduled_time timestamptz,
  status text,
  stream_id uuid,
  thumbnail_url text,
  title text
);

-- -----------------------------------------------------------------------------
-- livestream_tickets
-- -----------------------------------------------------------------------------
create table if not exists public.livestream_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount_paid_soflo numeric,
  amount_paid_usd numeric,
  badge_color text,
  chat_priority text,
  creator_email text,
  exclusive_badge text,
  payment_method text,
  payment_status text,
  perks jsonb,
  stream_id uuid,
  tier_id uuid,
  tier_name text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- maintenance_requests
-- -----------------------------------------------------------------------------
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  category text,
  issue_description text,
  issue_title text,
  landlord_email text,
  lease_id uuid,
  photos jsonb,
  priority text,
  property_address text,
  property_id uuid,
  status text,
  tenant_email text,
  tenant_name text
);

-- -----------------------------------------------------------------------------
-- marketplace_items
-- -----------------------------------------------------------------------------
create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  availability text,
  category text,
  created_by text,
  description text,
  escrow_required boolean,
  image_url text,
  instant_booking boolean,
  is_rental boolean,
  location text,
  mileage_limit text,
  package_details text,
  price numeric,
  price_type text,
  provider_email text,
  provider_name text,
  rating numeric,
  reviews_count integer,
  security_deposit numeric,
  seller_email text,
  seller_name text,
  service_area text,
  status text,
  title text,
  verified_provider boolean
);

-- -----------------------------------------------------------------------------
-- membership_subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.membership_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- menu_items
-- -----------------------------------------------------------------------------
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  owner_email text,
  restaurant_id uuid
);

-- -----------------------------------------------------------------------------
-- moderation_flags
-- -----------------------------------------------------------------------------
create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- music_albums
-- -----------------------------------------------------------------------------
create table if not exists public.music_albums (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  artist_email text,
  status text
);

-- -----------------------------------------------------------------------------
-- music_contracts
-- -----------------------------------------------------------------------------
create table if not exists public.music_contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  ai_generated_terms jsonb,
  contract_text text,
  contract_type text,
  parties jsonb,
  status text
);

-- -----------------------------------------------------------------------------
-- music_deal_applications
-- -----------------------------------------------------------------------------
create table if not exists public.music_deal_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  artist_email text,
  artist_name text,
  status text
);

-- -----------------------------------------------------------------------------
-- music_distributions
-- -----------------------------------------------------------------------------
create table if not exists public.music_distributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  artist_email text
);

-- -----------------------------------------------------------------------------
-- music_masterings
-- -----------------------------------------------------------------------------
create table if not exists public.music_masterings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  approved_date timestamptz,
  artist_email text,
  status text
);

-- -----------------------------------------------------------------------------
-- music_tracks
-- -----------------------------------------------------------------------------
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  artist text,
  artist_email text,
  artist_name text,
  music_video_url text,
  status text,
  stream_count integer
);

-- -----------------------------------------------------------------------------
-- news_posts
-- -----------------------------------------------------------------------------
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  agora_channel_name text,
  author_email text,
  author_name text,
  author_photo text,
  is_live boolean,
  likes jsonb,
  live_ended_at timestamptz,
  live_started_at timestamptz,
  live_viewers text,
  status text
);

-- -----------------------------------------------------------------------------
-- notification_preferences
-- -----------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  user_email text
);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  action_url text,
  message text,
  metadata jsonb,
  priority text,
  read boolean,
  recipient_email text,
  reference_id uuid,
  reference_type text,
  related_id uuid,
  sender_email text,
  sender_name text,
  sender_photo text,
  title text,
  type text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- onboarding_progress
-- -----------------------------------------------------------------------------
create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  onboarding_type text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  customer_notes text,
  customer_phone text,
  delivery_address text,
  fulfillment_method text,
  handling_fee numeric,
  item_id uuid,
  item_price numeric,
  item_title text,
  notes text,
  order_type text,
  payment_intent_id text,
  pickup text,
  pickup_location text,
  pickup_notification_sent boolean,
  pickup_ready_at timestamptz,
  platform_fee numeric,
  product_id uuid,
  product_name text,
  provider_email text,
  quantity integer,
  shipping_address text,
  shipping_carrier text,
  shipping_cost numeric,
  status text,
  subtotal numeric,
  total_amount numeric,
  total_usd numeric,
  tracking_number text,
  tracking_url text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- p2p_escrows
-- -----------------------------------------------------------------------------
create table if not exists public.p2p_escrows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  admin_notes text,
  buyer_email text,
  crypto_amount numeric,
  crypto_currency text,
  dispute_reason text,
  fiat_amount numeric,
  order_id uuid,
  payment_confirmed_at timestamptz,
  payment_method text,
  seller_email text,
  status text
);

-- -----------------------------------------------------------------------------
-- p2p_orders
-- -----------------------------------------------------------------------------
create table if not exists public.p2p_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  buyer_email text,
  completed_at timestamptz,
  crypto_amount numeric,
  crypto_currency text,
  escrow_id uuid,
  fiat_currency text,
  item_category text,
  item_title text,
  item_type text,
  matched_at timestamptz,
  order_type text,
  original_price numeric,
  payment_method text,
  price_per_unit numeric,
  rated boolean,
  seller_email text,
  status text,
  terms text,
  total_amount numeric
);

-- -----------------------------------------------------------------------------
-- p2p_transactions
-- -----------------------------------------------------------------------------
create table if not exists public.p2p_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- password_entries
-- -----------------------------------------------------------------------------
create table if not exists public.password_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  category text,
  encrypted_password text,
  is_favorite boolean,
  notes text,
  title text,
  user_email text,
  username text,
  website text
);

-- -----------------------------------------------------------------------------
-- payment_cards
-- -----------------------------------------------------------------------------
create table if not exists public.payment_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  billing_zip text,
  brand text,
  card_type text,
  cardholder_name text,
  exp_month integer,
  exp_year integer,
  is_primary boolean,
  last4 text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- payment_methods
-- -----------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  is_default boolean,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- payment_requests
-- -----------------------------------------------------------------------------
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  note text,
  original_payment_id text,
  payer_email text,
  payer_name text,
  request_type text,
  requester_email text,
  requester_name text,
  responded_at timestamptz,
  status text
);

-- -----------------------------------------------------------------------------
-- payments
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  amount_rri numeric,
  amount_usd numeric,
  created_by text,
  currency text,
  description text,
  is_active boolean,
  item_id uuid,
  item_type text,
  memo text,
  metadata jsonb,
  method text,
  next_execution_date timestamptz,
  payer_email text,
  payment_method text,
  payment_type text,
  receiver_email text,
  recipient_email text,
  reference_id uuid,
  reference_type text,
  sender_email text,
  status text,
  transaction_type text
);

-- -----------------------------------------------------------------------------
-- payout_methods
-- -----------------------------------------------------------------------------
create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  is_primary boolean,
  method_type text,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- payout_requests
-- -----------------------------------------------------------------------------
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  method_type text,
  net_amount numeric,
  payout_method_id uuid,
  platform_fee numeric,
  processing_fee numeric,
  provider_email text,
  requested_date timestamptz,
  revenue_breakdown jsonb,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- physical_card_requests
-- -----------------------------------------------------------------------------
create table if not exists public.physical_card_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  user_email text
);

-- -----------------------------------------------------------------------------
-- playlists
-- -----------------------------------------------------------------------------
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  is_public boolean,
  owner_email text,
  title text,
  video_ids jsonb
);

-- -----------------------------------------------------------------------------
-- poll_votes
-- -----------------------------------------------------------------------------
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  option_id uuid,
  poll_id uuid,
  user_email text
);

-- -----------------------------------------------------------------------------
-- portfolio_items
-- -----------------------------------------------------------------------------
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  is_featured boolean,
  user_email text
);

-- -----------------------------------------------------------------------------
-- ppv_contents
-- -----------------------------------------------------------------------------
create table if not exists public.ppv_contents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  is_active boolean,
  revenue_generated numeric,
  total_purchases integer
);

-- -----------------------------------------------------------------------------
-- ppv_purchases
-- -----------------------------------------------------------------------------
create table if not exists public.ppv_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  access_expires_at timestamptz,
  amount_paid_rri numeric,
  amount_paid_usd numeric,
  creator_email text,
  payment_method text,
  ppv_content_id uuid,
  user_email text
);

-- -----------------------------------------------------------------------------
-- properties
-- -----------------------------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  created_by text,
  rating numeric,
  reviews_count integer
);

-- -----------------------------------------------------------------------------
-- property_bookings
-- -----------------------------------------------------------------------------
create table if not exists public.property_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  doc_rejection_reason text,
  doc_verification_status text,
  doc_verified_at timestamptz,
  doc_verified_by text,
  host_email text,
  house_rules_accepted boolean,
  id_back_url text,
  id_front_url text,
  id_type text,
  selfie_url text,
  status text
);

-- -----------------------------------------------------------------------------
-- provider_availabilities
-- -----------------------------------------------------------------------------
create table if not exists public.provider_availabilities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  day_of_week text,
  provider_email text
);

-- -----------------------------------------------------------------------------
-- provider_onboardings
-- -----------------------------------------------------------------------------
create table if not exists public.provider_onboardings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  provider_type text,
  tooltips_dismissed boolean,
  user_email text
);

-- -----------------------------------------------------------------------------
-- provider_verifications
-- -----------------------------------------------------------------------------
create table if not exists public.provider_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  document_url text,
  provider_email text,
  status text,
  verification_type text
);

-- -----------------------------------------------------------------------------
-- qa_questions
-- -----------------------------------------------------------------------------
create table if not exists public.qa_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  answer text,
  status text,
  stream_id uuid,
  upvotes integer,
  user_email text,
  user_name text
);

-- -----------------------------------------------------------------------------
-- ratings
-- -----------------------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  categories jsonb,
  provider_email text,
  rated_email text,
  rater_email text,
  rater_type text,
  rating numeric,
  review text,
  ride_id uuid
);

-- -----------------------------------------------------------------------------
-- reels
-- -----------------------------------------------------------------------------
create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  audio_name text,
  caption text,
  comments_count integer,
  creator_email text,
  creator_name text,
  creator_photo text,
  is_public boolean,
  liked_by jsonb,
  likes_count integer,
  shares_count integer,
  tags jsonb,
  video_url text,
  views_count integer
);

-- -----------------------------------------------------------------------------
-- rent_payments
-- -----------------------------------------------------------------------------
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  due_date timestamptz,
  landlord_email text,
  late_fee_applied boolean,
  late_fee_waived boolean,
  late_fee_waived_by text,
  late_fee_waived_reason text,
  lease_id uuid,
  paid_date timestamptz,
  payment_date timestamptz,
  payment_method text,
  payment_type text,
  property_address text,
  property_id uuid,
  status text,
  tenant_email text,
  total_amount_due numeric
);

-- -----------------------------------------------------------------------------
-- restaurants
-- -----------------------------------------------------------------------------
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  created_by text,
  owner_email text
);

-- -----------------------------------------------------------------------------
-- revenue_shares
-- -----------------------------------------------------------------------------
create table if not exists public.revenue_shares (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content_id uuid,
  creator_email text,
  share_percent numeric
);

-- -----------------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  category_ratings jsonb,
  content text,
  helpful_by jsonb,
  helpful_count integer,
  photos jsonb,
  provider_email text,
  rating numeric,
  reviewer_avatar text,
  reviewer_email text,
  reviewer_name text,
  service_id uuid,
  service_name text,
  service_type text,
  status text,
  title text,
  verified_purchase boolean
);

-- -----------------------------------------------------------------------------
-- ride_requests
-- -----------------------------------------------------------------------------
create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  cancellation_details jsonb,
  cancellation_reason text,
  cancelled_by text,
  conversation_id uuid,
  created_by text,
  destination text,
  driver_email text,
  driver_name text,
  driver_profile_picture text,
  driver_status text,
  driver_vehicle_info jsonb,
  dropoff_address text,
  dropoff_coords jsonb,
  end_time timestamptz,
  estimated_distance_miles numeric,
  estimated_duration_minutes integer,
  fare_breakdown jsonb,
  gift_code text,
  gift_recipient_email text,
  gift_recipient_name text,
  gift_recipient_phone text,
  is_for_someone_else boolean,
  is_gift_ride boolean,
  is_scheduled boolean,
  is_shared boolean,
  matched_at timestamptz,
  max_passengers integer,
  passenger_email text,
  passenger_rating numeric,
  passenger_review text,
  passenger_verification_code text,
  pickup_address text,
  pickup_coords jsonb,
  price numeric,
  recipient_name text,
  recipient_phone text,
  ride_type text,
  rider_preferences jsonb,
  route_geometry jsonb,
  safety_pin text,
  safety_pin_confirmed boolean,
  start_time timestamptz,
  status text,
  vehicle_class_details jsonb
);

-- -----------------------------------------------------------------------------
-- royalty_earnings
-- -----------------------------------------------------------------------------
create table if not exists public.royalty_earnings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  user_email text
);

-- -----------------------------------------------------------------------------
-- royalty_payouts
-- -----------------------------------------------------------------------------
create table if not exists public.royalty_payouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  user_email text
);

-- -----------------------------------------------------------------------------
-- royalty_splits
-- -----------------------------------------------------------------------------
create table if not exists public.royalty_splits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  track_id uuid
);

-- -----------------------------------------------------------------------------
-- saved_groups
-- -----------------------------------------------------------------------------
create table if not exists public.saved_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  group_id uuid,
  group_name text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- saved_jobs
-- -----------------------------------------------------------------------------
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  application_url text,
  company_name text,
  job_category text,
  job_id uuid,
  job_location text,
  job_title text,
  job_type text,
  pay_rate numeric,
  pay_type text,
  poster_photo text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- saved_properties
-- -----------------------------------------------------------------------------
create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  collection_name text,
  listing_type text,
  property_id uuid,
  property_image text,
  property_location text,
  property_price numeric,
  property_title text,
  property_type text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- service_agreements
-- -----------------------------------------------------------------------------
create table if not exists public.service_agreements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  acceptance_method text,
  agreement_text text,
  contract_id uuid,
  customer_email text,
  customer_ip_address text,
  customer_name text,
  customer_signature text,
  provider_email text,
  service_id uuid,
  signed_at timestamptz,
  status text
);

-- -----------------------------------------------------------------------------
-- service_availability_overrides
-- -----------------------------------------------------------------------------
create table if not exists public.service_availability_overrides (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  end_time text,
  is_active boolean,
  is_available boolean,
  override_date timestamptz,
  provider_email text,
  reason text,
  service_id uuid,
  start_time text
);

-- -----------------------------------------------------------------------------
-- service_bookings
-- -----------------------------------------------------------------------------
create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  booking_date timestamptz,
  booking_time text,
  confirmation_code text,
  customer_email text,
  customer_name text,
  customer_notes text,
  customer_phone text,
  duration_hours numeric,
  group_size integer,
  location text,
  metadata jsonb,
  notes text,
  payment_intent_id text,
  payment_option text,
  provider_email text,
  provider_name text,
  provider_notes text,
  rating numeric,
  review_submitted boolean,
  service_id uuid,
  service_title text,
  status text,
  total_price numeric
);

-- -----------------------------------------------------------------------------
-- service_contracts
-- -----------------------------------------------------------------------------
create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  body text,
  creator_email text,
  creator_name text,
  creator_signature text,
  creator_signed_at timestamptz,
  delivery_method text,
  end_date timestamptz,
  is_active boolean,
  liability_disclaimer_accepted boolean,
  provider_email text,
  recipient_email text,
  recipient_name text,
  recipient_signature text,
  recipient_signed_at timestamptz,
  service_description text,
  start_date timestamptz,
  status text,
  title text,
  viewed_at timestamptz
);

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- shared_content_libraries
-- -----------------------------------------------------------------------------
create table if not exists public.shared_content_libraries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content_ids jsonb,
  revenue_split jsonb
);

-- -----------------------------------------------------------------------------
-- showcase_posts
-- -----------------------------------------------------------------------------
create table if not exists public.showcase_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  creator_name text,
  creator_photo text,
  price numeric,
  tags jsonb
);

-- -----------------------------------------------------------------------------
-- social_posts
-- -----------------------------------------------------------------------------
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  author_email text,
  author_name text,
  caption text,
  comments_count integer,
  created_by text,
  creator_name text,
  creator_profile_picture text,
  creator_username text,
  experience_type text,
  image_url text,
  is_experience boolean,
  is_story boolean,
  liked_by jsonb,
  likes_count integer,
  location text,
  media_type text,
  music_playing text,
  vibe text,
  views_count integer
);

-- -----------------------------------------------------------------------------
-- sponsored_contents
-- -----------------------------------------------------------------------------
create table if not exists public.sponsored_contents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  status text
);

-- -----------------------------------------------------------------------------
-- stakings
-- -----------------------------------------------------------------------------
create table if not exists public.stakings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  apy numeric,
  currency text,
  earned_rewards text,
  end_date timestamptz,
  last_reward_calculation text,
  lock_period_days integer,
  start_date timestamptz,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- stock_alerts
-- -----------------------------------------------------------------------------
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  alert_type text,
  current_stock integer,
  is_resolved boolean,
  item_id uuid,
  item_name text,
  owner_email text,
  resolved_at timestamptz,
  threshold integer
);

-- -----------------------------------------------------------------------------
-- store_settings
-- -----------------------------------------------------------------------------
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  owner_email text,
  store_name text
);

-- -----------------------------------------------------------------------------
-- stories
-- -----------------------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  caption text,
  creator_name text,
  creator_profile_picture text,
  expires_at timestamptz,
  media_type text,
  media_url text,
  music text,
  views integer,
  visibility text
);

-- -----------------------------------------------------------------------------
-- stream_goals
-- -----------------------------------------------------------------------------
create table if not exists public.stream_goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  goal_description text,
  goal_title text,
  goal_type text,
  is_active boolean,
  stream_id uuid,
  target_amount numeric
);

-- -----------------------------------------------------------------------------
-- streaming_contents
-- -----------------------------------------------------------------------------
create table if not exists public.streaming_contents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  agora_channel_name text,
  betting_available boolean,
  category text,
  chapters jsonb,
  clip_end_time numeric,
  clip_start_time numeric,
  content_type text,
  created_by text,
  creator_email text,
  creator_username text,
  description text,
  duration numeric,
  is_live boolean,
  is_monetized boolean,
  liked_by jsonb,
  likes_count integer,
  price_usd numeric,
  rating numeric,
  rental_price_usd numeric,
  requires_subscription boolean,
  source_stream_id uuid,
  source_type text,
  status text,
  stream_ended_at timestamptz,
  stream_started_at timestamptz,
  tags jsonb,
  thumbnail_url text,
  title text,
  type text,
  video_url text,
  views integer,
  visibility text,
  vod_trim_end numeric
);

-- -----------------------------------------------------------------------------
-- stripe_payments
-- -----------------------------------------------------------------------------
create table if not exists public.stripe_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount numeric,
  currency text,
  description text,
  payment_method text,
  status text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- subscription_tiers
-- -----------------------------------------------------------------------------
create table if not exists public.subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  creator_email text,
  creator_username text,
  is_active boolean
);

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- support_messages
-- -----------------------------------------------------------------------------
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  is_internal boolean,
  sender_email text,
  sender_type text,
  ticket_id uuid
);

-- -----------------------------------------------------------------------------
-- support_tickets
-- -----------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  assigned_agent_email text,
  description text,
  priority text,
  status text,
  subject text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- sync_messages
-- -----------------------------------------------------------------------------
create table if not exists public.sync_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  message text,
  message_type text,
  sender_email text,
  sender_name text,
  sync_request_id uuid
);

-- -----------------------------------------------------------------------------
-- sync_requests
-- -----------------------------------------------------------------------------
create table if not exists public.sync_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  admin_notes text,
  artist_email text,
  status text
);

-- -----------------------------------------------------------------------------
-- tax_reports
-- -----------------------------------------------------------------------------
create table if not exists public.tax_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  transaction_details jsonb,
  user_email text
);

-- -----------------------------------------------------------------------------
-- ticket_affiliates
-- -----------------------------------------------------------------------------
create table if not exists public.ticket_affiliates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  conversion_status text,
  payout_date timestamptz
);

-- -----------------------------------------------------------------------------
-- tip_transactions
-- -----------------------------------------------------------------------------
create table if not exists public.tip_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  amount_rri numeric,
  amount_usd numeric,
  content_id uuid,
  creator_email text,
  creator_username text,
  from_email text,
  from_name text,
  is_livestream_tip boolean,
  message text,
  payment_intent_id text,
  recipient_email text,
  status text,
  tipper_email text,
  tipper_name text,
  tipper_username text
);

-- -----------------------------------------------------------------------------
-- trader_ratings
-- -----------------------------------------------------------------------------
create table if not exists public.trader_ratings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  aspects jsonb,
  order_id uuid,
  rater_email text,
  rating numeric,
  review_text text,
  trade_type text,
  trader_email text
);

-- -----------------------------------------------------------------------------
-- travel_alerts
-- -----------------------------------------------------------------------------
create table if not exists public.travel_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- travel_bookings
-- -----------------------------------------------------------------------------
create table if not exists public.travel_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  add_ons_total numeric,
  base_price numeric,
  booking_date timestamptz,
  booking_time text,
  category text,
  customer_email text,
  customer_name text,
  duration_hours numeric,
  guests integer,
  listing_id uuid,
  listing_title text,
  payment_status text,
  provider_email text,
  selected_add_ons jsonb,
  special_requests text,
  status text,
  stripe_session_id text,
  total_amount numeric
);

-- -----------------------------------------------------------------------------
-- travel_listings
-- -----------------------------------------------------------------------------
create table if not exists public.travel_listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  category text,
  is_active boolean,
  provider_email text,
  provider_name text
);

-- -----------------------------------------------------------------------------
-- two_factor_codes
-- -----------------------------------------------------------------------------
create table if not exists public.two_factor_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- user_galleries
-- -----------------------------------------------------------------------------
create table if not exists public.user_galleries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  caption text,
  is_pinned boolean,
  liked_by jsonb,
  likes_count integer,
  media_type text,
  media_url text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- user_interactions
-- -----------------------------------------------------------------------------
create table if not exists public.user_interactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  user_email text
);

-- -----------------------------------------------------------------------------
-- user_interests
-- -----------------------------------------------------------------------------
create table if not exists public.user_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  user_email text
);

-- -----------------------------------------------------------------------------
-- user_inventories
-- -----------------------------------------------------------------------------
create table if not exists public.user_inventories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  game_name text,
  is_equipped boolean,
  item_id uuid,
  item_name text,
  item_type text,
  purchase_date timestamptz,
  user_email text,
  uses_remaining integer
);

-- -----------------------------------------------------------------------------
-- user_job_preferences
-- -----------------------------------------------------------------------------
create table if not exists public.user_job_preferences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- user_presences
-- -----------------------------------------------------------------------------
create table if not exists public.user_presences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  last_seen text,
  status text,
  typing_started text,
  typing_to text,
  user_email text,
  user_name text,
  user_photo text
);

-- -----------------------------------------------------------------------------
-- user_reviews
-- -----------------------------------------------------------------------------
create table if not exists public.user_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  booking_id uuid,
  categories jsonb,
  helpful_count integer,
  host_response text,
  host_response_date timestamptz,
  property_id uuid,
  property_title text,
  provider_email text,
  rating numeric,
  review_text text,
  review_type text,
  reviewed_email text,
  reviewed_user_email text,
  reviewer_email text,
  reviewer_name text,
  reviewer_photo text,
  verified_transaction boolean
);

-- -----------------------------------------------------------------------------
-- user_subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  billing_period text,
  creator_email text,
  monthly_amount_usd numeric,
  next_billing_date timestamptz,
  price_per_period numeric,
  start_date timestamptz,
  status text,
  subscriber_email text,
  subscription_tier_id uuid,
  tier_name text,
  user_email text
);

-- -----------------------------------------------------------------------------
-- user_vehicles
-- -----------------------------------------------------------------------------
create table if not exists public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  acceleration numeric,
  color text,
  handling numeric,
  is_equipped boolean,
  is_unlocked boolean,
  price numeric,
  top_speed numeric,
  total_distance numeric,
  user_email text,
  vehicle_name text,
  vehicle_type text
);

-- -----------------------------------------------------------------------------
-- utility_accounts
-- -----------------------------------------------------------------------------
create table if not exists public.utility_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- video_comments
-- -----------------------------------------------------------------------------
create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  comment_text text,
  user_email text,
  user_name text,
  video_id uuid
);

-- -----------------------------------------------------------------------------
-- video_likes
-- -----------------------------------------------------------------------------
create table if not exists public.video_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- video_posts
-- -----------------------------------------------------------------------------
create table if not exists public.video_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  caption text,
  challenge_id uuid,
  comments_count integer,
  created_by text,
  creator_email text,
  creator_name text,
  engagement_score numeric,
  filters_applied boolean,
  hashtags jsonb,
  is_duet boolean,
  is_stitch boolean,
  original_video_id uuid,
  sounds_used jsonb,
  video_url text
);

-- -----------------------------------------------------------------------------
-- video_templates
-- -----------------------------------------------------------------------------
create table if not exists public.video_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  created_by text,
  uses_count integer
);

-- -----------------------------------------------------------------------------
-- viewer_analytics
-- -----------------------------------------------------------------------------
create table if not exists public.viewer_analytics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content_id uuid,
  created_by text,
  is_currently_watching boolean,
  viewer_email text
);

-- -----------------------------------------------------------------------------
-- watch_parties
-- -----------------------------------------------------------------------------
create table if not exists public.watch_parties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content_id uuid,
  current_playback_time numeric,
  host_email text,
  host_name text,
  is_active boolean,
  is_playing boolean,
  is_public boolean,
  max_participants integer,
  participants jsonb,
  party_name text
);

-- -----------------------------------------------------------------------------
-- watch_party_messages
-- -----------------------------------------------------------------------------
create table if not exists public.watch_party_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  message text,
  party_id uuid,
  sender_email text,
  sender_name text
);

-- -----------------------------------------------------------------------------
-- watch_party_playlists
-- -----------------------------------------------------------------------------
create table if not exists public.watch_party_playlists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_date timestamptz default now(),
  content_items jsonb,
  current_index integer,
  party_id uuid
);

-- =============================================================================
-- Defensive column backfill: ADD COLUMN IF NOT EXISTS for every column above.
-- No-ops for a table CREATE TABLE IF NOT EXISTS just created; fills in any gap
-- on a table that already existed with a different/partial shape.
-- =============================================================================

alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists created_date timestamptz default now();
alter table public.profiles add column if not exists about_us text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists balance numeric;
alter table public.profiles add column if not exists balance_usd numeric;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists crypto_2fa_enabled boolean;
alter table public.profiles add column if not exists current_music text;
alter table public.profiles add column if not exists daily_crypto_staking_limit integer;
alter table public.profiles add column if not exists daily_crypto_withdrawal_limit integer;
alter table public.profiles add column if not exists daily_staking_used numeric;
alter table public.profiles add column if not exists dismissed_tooltips jsonb;
alter table public.profiles add column if not exists driver_current_lat double precision;
alter table public.profiles add column if not exists driver_current_lng double precision;
alter table public.profiles add column if not exists driver_is_online boolean;
alter table public.profiles add column if not exists driver_last_location_update timestamptz;
alter table public.profiles add column if not exists driver_mode text;
alter table public.profiles add column if not exists driver_rating numeric;
alter table public.profiles add column if not exists driver_status text;
alter table public.profiles add column if not exists driver_total_ratings integer;
alter table public.profiles add column if not exists driver_vehicle_info jsonb;
alter table public.profiles add column if not exists earnings_onboarding_completed boolean;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists favorite_drivers jsonb;
alter table public.profiles add column if not exists followers_count integer;
alter table public.profiles add column if not exists following jsonb;
alter table public.profiles add column if not exists following_count integer;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists highlights_v2 jsonb;
alter table public.profiles add column if not exists interests jsonb;
alter table public.profiles add column if not exists is_creator boolean;
alter table public.profiles add column if not exists is_driver boolean;
alter table public.profiles add column if not exists is_driver_online boolean;
alter table public.profiles add column if not exists is_live_streaming boolean;
alter table public.profiles add column if not exists is_provider boolean;
alter table public.profiles add column if not exists is_restaurant_owner boolean;
alter table public.profiles add column if not exists link_in_bio text;
alter table public.profiles add column if not exists live_stream_id uuid;
alter table public.profiles add column if not exists notification_preferences jsonb;
alter table public.profiles add column if not exists onboarding_completed boolean;
alter table public.profiles add column if not exists onboarding_status jsonb;
alter table public.profiles add column if not exists payout_schedule text;
alter table public.profiles add column if not exists permissions jsonb;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists primary_currency text;
alter table public.profiles add column if not exists primary_use text;
alter table public.profiles add column if not exists profile_customization jsonb;
alter table public.profiles add column if not exists profile_picture text;
alter table public.profiles add column if not exists provider_business_address text;
alter table public.profiles add column if not exists provider_business_name text;
alter table public.profiles add column if not exists provider_category text;
alter table public.profiles add column if not exists provider_description text;
alter table public.profiles add column if not exists provider_logo_url text;
alter table public.profiles add column if not exists provider_onboarding_completed boolean;
alter table public.profiles add column if not exists provider_phone text;
alter table public.profiles add column if not exists provider_trust_score numeric;
alter table public.profiles add column if not exists provider_verification_level text;
alter table public.profiles add column if not exists provider_wallet_balance numeric;
alter table public.profiles add column if not exists provider_website text;
alter table public.profiles add column if not exists provider_years_experience integer;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists ride_preferences jsonb;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists saved_addresses jsonb;
alter table public.profiles add column if not exists saved_experiences jsonb;
alter table public.profiles add column if not exists service_area text;
alter table public.profiles add column if not exists show_dual_currency boolean;
alter table public.profiles add column if not exists social_links jsonb;
alter table public.profiles add column if not exists soflo_balance numeric;
alter table public.profiles add column if not exists soflo_coins numeric;
alter table public.profiles add column if not exists stripe_account_id text;
alter table public.profiles add column if not exists stripe_connect_account_id text;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists usd_balance numeric;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists wallet_balance numeric;
alter table public.profiles add column if not exists wallet_balance_usd numeric;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists welcome_bonus_claimed boolean;
alter table public.profiles add column if not exists withdrawal_confirmations_required boolean;

alter table public.ad_campaigns add column if not exists created_at timestamptz default now();
alter table public.ad_campaigns add column if not exists updated_at timestamptz default now();
alter table public.ad_campaigns add column if not exists created_date timestamptz default now();
alter table public.ad_campaigns add column if not exists advertiser_email text;
alter table public.ad_campaigns add column if not exists ai_optimized boolean;
alter table public.ad_campaigns add column if not exists budget_amount numeric;
alter table public.ad_campaigns add column if not exists headline text;
alter table public.ad_campaigns add column if not exists schedule jsonb;
alter table public.ad_campaigns add column if not exists status text;

alter table public.affiliate_listings add column if not exists created_at timestamptz default now();
alter table public.affiliate_listings add column if not exists updated_at timestamptz default now();
alter table public.affiliate_listings add column if not exists created_date timestamptz default now();
alter table public.affiliate_listings add column if not exists benefits jsonb;
alter table public.affiliate_listings add column if not exists clicks integer;
alter table public.affiliate_listings add column if not exists likes jsonb;
alter table public.affiliate_listings add column if not exists poster_email text;
alter table public.affiliate_listings add column if not exists poster_name text;
alter table public.affiliate_listings add column if not exists poster_photo text;
alter table public.affiliate_listings add column if not exists rating numeric;
alter table public.affiliate_listings add column if not exists requirements jsonb;
alter table public.affiliate_listings add column if not exists review_count integer;
alter table public.affiliate_listings add column if not exists status text;

alter table public.affiliate_referrals add column if not exists created_at timestamptz default now();
alter table public.affiliate_referrals add column if not exists updated_at timestamptz default now();
alter table public.affiliate_referrals add column if not exists created_date timestamptz default now();
alter table public.affiliate_referrals add column if not exists affiliate_program text;
alter table public.affiliate_referrals add column if not exists created_by text;
alter table public.affiliate_referrals add column if not exists is_sub_affiliate boolean;
alter table public.affiliate_referrals add column if not exists parent_affiliate_code text;
alter table public.affiliate_referrals add column if not exists referral_code text;
alter table public.affiliate_referrals add column if not exists referred_user_email text;
alter table public.affiliate_referrals add column if not exists status text;

alter table public.affiliate_reviews add column if not exists created_at timestamptz default now();
alter table public.affiliate_reviews add column if not exists updated_at timestamptz default now();
alter table public.affiliate_reviews add column if not exists created_date timestamptz default now();
alter table public.affiliate_reviews add column if not exists helpful_count integer;
alter table public.affiliate_reviews add column if not exists listing_id uuid;

alter table public.ai_recommendations add column if not exists created_at timestamptz default now();
alter table public.ai_recommendations add column if not exists updated_at timestamptz default now();
alter table public.ai_recommendations add column if not exists created_date timestamptz default now();

alter table public.ai_tools add column if not exists created_at timestamptz default now();
alter table public.ai_tools add column if not exists updated_at timestamptz default now();
alter table public.ai_tools add column if not exists created_date timestamptz default now();

alter table public.amazon_orders add column if not exists created_at timestamptz default now();
alter table public.amazon_orders add column if not exists updated_at timestamptz default now();
alter table public.amazon_orders add column if not exists created_date timestamptz default now();
alter table public.amazon_orders add column if not exists price numeric;
alter table public.amazon_orders add column if not exists user_email text;

alter table public.assets add column if not exists created_at timestamptz default now();
alter table public.assets add column if not exists updated_at timestamptz default now();
alter table public.assets add column if not exists created_date timestamptz default now();

alter table public.bank_accounts add column if not exists created_at timestamptz default now();
alter table public.bank_accounts add column if not exists updated_at timestamptz default now();
alter table public.bank_accounts add column if not exists created_date timestamptz default now();
alter table public.bank_accounts add column if not exists account_holder_name text;
alter table public.bank_accounts add column if not exists account_number_last4 text;
alter table public.bank_accounts add column if not exists account_type text;
alter table public.bank_accounts add column if not exists bank_name text;
alter table public.bank_accounts add column if not exists is_primary boolean;
alter table public.bank_accounts add column if not exists is_verified boolean;
alter table public.bank_accounts add column if not exists routing_number text;
alter table public.bank_accounts add column if not exists user_email text;

alter table public.bill_payments add column if not exists created_at timestamptz default now();
alter table public.bill_payments add column if not exists updated_at timestamptz default now();
alter table public.bill_payments add column if not exists created_date timestamptz default now();

alter table public.blocks add column if not exists created_at timestamptz default now();
alter table public.blocks add column if not exists updated_at timestamptz default now();
alter table public.blocks add column if not exists created_date timestamptz default now();
alter table public.blocks add column if not exists blocked_email text;
alter table public.blocks add column if not exists blocked_name text;
alter table public.blocks add column if not exists blocker_email text;
alter table public.blocks add column if not exists blocker_name text;

alter table public.bookings add column if not exists created_at timestamptz default now();
alter table public.bookings add column if not exists updated_at timestamptz default now();
alter table public.bookings add column if not exists created_date timestamptz default now();
alter table public.bookings add column if not exists booking_date timestamptz;
alter table public.bookings add column if not exists booking_status text;
alter table public.bookings add column if not exists booking_type text;
alter table public.bookings add column if not exists cancellation_fee numeric;
alter table public.bookings add column if not exists cancellation_reason text;
alter table public.bookings add column if not exists cancelled_at timestamptz;
alter table public.bookings add column if not exists confirmation_code text;
alter table public.bookings add column if not exists created_by text;
alter table public.bookings add column if not exists experience_id uuid;
alter table public.bookings add column if not exists experience_title text;
alter table public.bookings add column if not exists host_email text;
alter table public.bookings add column if not exists number_of_guests integer;
alter table public.bookings add column if not exists payment_method text;
alter table public.bookings add column if not exists payment_status text;
alter table public.bookings add column if not exists provider_email text;
alter table public.bookings add column if not exists special_requests text;
alter table public.bookings add column if not exists status text;
alter table public.bookings add column if not exists total_price_usd numeric;

alter table public.campaign_backers add column if not exists created_at timestamptz default now();
alter table public.campaign_backers add column if not exists updated_at timestamptz default now();
alter table public.campaign_backers add column if not exists created_date timestamptz default now();
alter table public.campaign_backers add column if not exists amount numeric;
alter table public.campaign_backers add column if not exists backer_email text;
alter table public.campaign_backers add column if not exists campaign_id uuid;
alter table public.campaign_backers add column if not exists message text;
alter table public.campaign_backers add column if not exists payment_status text;
alter table public.campaign_backers add column if not exists reward_tier_id uuid;

alter table public.car_rentals add column if not exists created_at timestamptz default now();
alter table public.car_rentals add column if not exists updated_at timestamptz default now();
alter table public.car_rentals add column if not exists created_date timestamptz default now();
alter table public.car_rentals add column if not exists car_make text;
alter table public.car_rentals add column if not exists car_model text;
alter table public.car_rentals add column if not exists conversation_id uuid;
alter table public.car_rentals add column if not exists doc_rejection_reason text;
alter table public.car_rentals add column if not exists doc_verification_status text;
alter table public.car_rentals add column if not exists doc_verified_at timestamptz;
alter table public.car_rentals add column if not exists doc_verified_by text;
alter table public.car_rentals add column if not exists drivers_license_back_url text;
alter table public.car_rentals add column if not exists drivers_license_url text;
alter table public.car_rentals add column if not exists insurance_card_url text;
alter table public.car_rentals add column if not exists license_expiry_date timestamptz;
alter table public.car_rentals add column if not exists license_number text;
alter table public.car_rentals add column if not exists provider_email text;
alter table public.car_rentals add column if not exists renter_email text;
alter table public.car_rentals add column if not exists start_date timestamptz;
alter table public.car_rentals add column if not exists status text;
alter table public.car_rentals add column if not exists total_amount numeric;

alter table public.cart_items add column if not exists created_at timestamptz default now();
alter table public.cart_items add column if not exists updated_at timestamptz default now();
alter table public.cart_items add column if not exists created_date timestamptz default now();
alter table public.cart_items add column if not exists menu_item_id uuid;
alter table public.cart_items add column if not exists menu_item_name text;
alter table public.cart_items add column if not exists menu_item_price numeric;
alter table public.cart_items add column if not exists quantity integer;
alter table public.cart_items add column if not exists restaurant_id uuid;
alter table public.cart_items add column if not exists user_email text;

alter table public.carts add column if not exists created_at timestamptz default now();
alter table public.carts add column if not exists updated_at timestamptz default now();
alter table public.carts add column if not exists created_date timestamptz default now();
alter table public.carts add column if not exists item_id uuid;
alter table public.carts add column if not exists quantity integer;
alter table public.carts add column if not exists user_email text;

alter table public.challenges add column if not exists created_at timestamptz default now();
alter table public.challenges add column if not exists updated_at timestamptz default now();
alter table public.challenges add column if not exists created_date timestamptz default now();
alter table public.challenges add column if not exists creator_email text;
alter table public.challenges add column if not exists is_active boolean;
alter table public.challenges add column if not exists start_date timestamptz;
alter table public.challenges add column if not exists total_videos integer;

alter table public.chat_conversations add column if not exists created_at timestamptz default now();
alter table public.chat_conversations add column if not exists updated_at timestamptz default now();
alter table public.chat_conversations add column if not exists created_date timestamptz default now();
alter table public.chat_conversations add column if not exists booking_id uuid;
alter table public.chat_conversations add column if not exists context_id uuid;
alter table public.chat_conversations add column if not exists context_type text;
alter table public.chat_conversations add column if not exists created_by text;
alter table public.chat_conversations add column if not exists is_group boolean;
alter table public.chat_conversations add column if not exists last_message text;
alter table public.chat_conversations add column if not exists last_message_at timestamptz;
alter table public.chat_conversations add column if not exists last_message_sender text;
alter table public.chat_conversations add column if not exists last_message_time timestamptz;
alter table public.chat_conversations add column if not exists muted_by jsonb;
alter table public.chat_conversations add column if not exists name text;
alter table public.chat_conversations add column if not exists participant_emails jsonb;
alter table public.chat_conversations add column if not exists participant_names jsonb;
alter table public.chat_conversations add column if not exists participants jsonb;
alter table public.chat_conversations add column if not exists pinned_by jsonb;
alter table public.chat_conversations add column if not exists provider_name text;
alter table public.chat_conversations add column if not exists reference_id uuid;
alter table public.chat_conversations add column if not exists ride_id uuid;
alter table public.chat_conversations add column if not exists service_id uuid;
alter table public.chat_conversations add column if not exists service_title text;
alter table public.chat_conversations add column if not exists title text;
alter table public.chat_conversations add column if not exists type text;
alter table public.chat_conversations add column if not exists unread_count integer;

alter table public.chat_messages add column if not exists created_at timestamptz default now();
alter table public.chat_messages add column if not exists updated_at timestamptz default now();
alter table public.chat_messages add column if not exists created_date timestamptz default now();
alter table public.chat_messages add column if not exists attachment_url text;
alter table public.chat_messages add column if not exists content text;
alter table public.chat_messages add column if not exists conversation_id uuid;
alter table public.chat_messages add column if not exists deleted_at timestamptz;
alter table public.chat_messages add column if not exists delivered_to jsonb;
alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.chat_messages add column if not exists is_deleted boolean;
alter table public.chat_messages add column if not exists is_edited boolean;
alter table public.chat_messages add column if not exists is_read boolean;
alter table public.chat_messages add column if not exists message text;
alter table public.chat_messages add column if not exists message_type text;
alter table public.chat_messages add column if not exists reactions jsonb;
alter table public.chat_messages add column if not exists read boolean;
alter table public.chat_messages add column if not exists read_by jsonb;
alter table public.chat_messages add column if not exists receiver_email text;
alter table public.chat_messages add column if not exists sender_email text;
alter table public.chat_messages add column if not exists sender_name text;
alter table public.chat_messages add column if not exists sender_photo text;
alter table public.chat_messages add column if not exists translation_data jsonb;
alter table public.chat_messages add column if not exists type text;

alter table public.co_stream_participants add column if not exists created_at timestamptz default now();
alter table public.co_stream_participants add column if not exists updated_at timestamptz default now();
alter table public.co_stream_participants add column if not exists created_date timestamptz default now();
alter table public.co_stream_participants add column if not exists can_broadcast text;
alter table public.co_stream_participants add column if not exists can_moderate text;
alter table public.co_stream_participants add column if not exists invited_by text;
alter table public.co_stream_participants add column if not exists joined_at timestamptz;
alter table public.co_stream_participants add column if not exists participant_email text;
alter table public.co_stream_participants add column if not exists status text;
alter table public.co_stream_participants add column if not exists stream_id uuid;

alter table public.collaborations add column if not exists created_at timestamptz default now();
alter table public.collaborations add column if not exists updated_at timestamptz default now();
alter table public.collaborations add column if not exists created_date timestamptz default now();
alter table public.collaborations add column if not exists initiator_email text;
alter table public.collaborations add column if not exists status text;

alter table public.collaborative_documents add column if not exists created_at timestamptz default now();
alter table public.collaborative_documents add column if not exists updated_at timestamptz default now();
alter table public.collaborative_documents add column if not exists created_date timestamptz default now();
alter table public.collaborative_documents add column if not exists content text;
alter table public.collaborative_documents add column if not exists last_edited_at timestamptz;
alter table public.collaborative_documents add column if not exists last_edited_by text;
alter table public.collaborative_documents add column if not exists share_expires_at timestamptz;
alter table public.collaborative_documents add column if not exists share_token text;
alter table public.collaborative_documents add column if not exists version text;

alter table public.collaborative_videos add column if not exists created_at timestamptz default now();
alter table public.collaborative_videos add column if not exists updated_at timestamptz default now();
alter table public.collaborative_videos add column if not exists created_date timestamptz default now();
alter table public.collaborative_videos add column if not exists comments integer;
alter table public.collaborative_videos add column if not exists status text;

alter table public.comments add column if not exists created_at timestamptz default now();
alter table public.comments add column if not exists updated_at timestamptz default now();
alter table public.comments add column if not exists created_date timestamptz default now();
alter table public.comments add column if not exists author_avatar text;
alter table public.comments add column if not exists author_email text;
alter table public.comments add column if not exists author_name text;
alter table public.comments add column if not exists author_photo text;
alter table public.comments add column if not exists content text;
alter table public.comments add column if not exists liked_by jsonb;
alter table public.comments add column if not exists likes_count integer;
alter table public.comments add column if not exists parent_comment_id uuid;
alter table public.comments add column if not exists post_id uuid;
alter table public.comments add column if not exists post_type text;
alter table public.comments add column if not exists reply_to_name text;
alter table public.comments add column if not exists user_email text;
alter table public.comments add column if not exists user_name text;
alter table public.comments add column if not exists user_photo text;

alter table public.content_analytics add column if not exists created_at timestamptz default now();
alter table public.content_analytics add column if not exists updated_at timestamptz default now();
alter table public.content_analytics add column if not exists created_date timestamptz default now();
alter table public.content_analytics add column if not exists creator_email text;

alter table public.content_edits add column if not exists created_at timestamptz default now();
alter table public.content_edits add column if not exists updated_at timestamptz default now();
alter table public.content_edits add column if not exists created_date timestamptz default now();
alter table public.content_edits add column if not exists editor_email text;
alter table public.content_edits add column if not exists editor_name text;
alter table public.content_edits add column if not exists reviewed_by text;
alter table public.content_edits add column if not exists status text;

alter table public.content_purchases add column if not exists created_at timestamptz default now();
alter table public.content_purchases add column if not exists updated_at timestamptz default now();
alter table public.content_purchases add column if not exists created_date timestamptz default now();
alter table public.content_purchases add column if not exists access_expires_at timestamptz;
alter table public.content_purchases add column if not exists amount_paid numeric;
alter table public.content_purchases add column if not exists amount_usd numeric;
alter table public.content_purchases add column if not exists buyer_email text;
alter table public.content_purchases add column if not exists content_id uuid;
alter table public.content_purchases add column if not exists content_type text;
alter table public.content_purchases add column if not exists creator_earnings numeric;
alter table public.content_purchases add column if not exists creator_email text;
alter table public.content_purchases add column if not exists item_id uuid;
alter table public.content_purchases add column if not exists item_type text;
alter table public.content_purchases add column if not exists payment_intent_id text;
alter table public.content_purchases add column if not exists payment_method text;
alter table public.content_purchases add column if not exists platform_fee numeric;
alter table public.content_purchases add column if not exists price_paid numeric;
alter table public.content_purchases add column if not exists product_id uuid;
alter table public.content_purchases add column if not exists purchase_type text;
alter table public.content_purchases add column if not exists seller_email text;

alter table public.creator_memberships add column if not exists created_at timestamptz default now();
alter table public.creator_memberships add column if not exists updated_at timestamptz default now();
alter table public.creator_memberships add column if not exists created_date timestamptz default now();
alter table public.creator_memberships add column if not exists creator_email text;

alter table public.creator_metrics add column if not exists created_at timestamptz default now();
alter table public.creator_metrics add column if not exists updated_at timestamptz default now();
alter table public.creator_metrics add column if not exists created_date timestamptz default now();
alter table public.creator_metrics add column if not exists creator_email text;

alter table public.creator_products add column if not exists created_at timestamptz default now();
alter table public.creator_products add column if not exists updated_at timestamptz default now();
alter table public.creator_products add column if not exists created_date timestamptz default now();
alter table public.creator_products add column if not exists clicks integer;
alter table public.creator_products add column if not exists created_by text;
alter table public.creator_products add column if not exists creator_email text;
alter table public.creator_products add column if not exists is_active boolean;
alter table public.creator_products add column if not exists is_featured boolean;
alter table public.creator_products add column if not exists product_type text;
alter table public.creator_products add column if not exists purchases integer;
alter table public.creator_products add column if not exists sales_count integer;
alter table public.creator_products add column if not exists stream_id uuid;
alter table public.creator_products add column if not exists type text;

alter table public.creator_subscriptions add column if not exists created_at timestamptz default now();
alter table public.creator_subscriptions add column if not exists updated_at timestamptz default now();
alter table public.creator_subscriptions add column if not exists created_date timestamptz default now();
alter table public.creator_subscriptions add column if not exists amount_usd numeric;
alter table public.creator_subscriptions add column if not exists billing_period text;
alter table public.creator_subscriptions add column if not exists creator_email text;
alter table public.creator_subscriptions add column if not exists is_active boolean;
alter table public.creator_subscriptions add column if not exists monthly_amount_usd numeric;
alter table public.creator_subscriptions add column if not exists started_at timestamptz;
alter table public.creator_subscriptions add column if not exists status text;
alter table public.creator_subscriptions add column if not exists subscriber_count integer;
alter table public.creator_subscriptions add column if not exists subscriber_email text;
alter table public.creator_subscriptions add column if not exists subscriber_name text;
alter table public.creator_subscriptions add column if not exists tier_id uuid;
alter table public.creator_subscriptions add column if not exists tier_name text;

alter table public.crowdfunding_campaigns add column if not exists created_at timestamptz default now();
alter table public.crowdfunding_campaigns add column if not exists updated_at timestamptz default now();
alter table public.crowdfunding_campaigns add column if not exists created_date timestamptz default now();
alter table public.crowdfunding_campaigns add column if not exists backers_count integer;
alter table public.crowdfunding_campaigns add column if not exists creator_email text;
alter table public.crowdfunding_campaigns add column if not exists current_amount numeric;
alter table public.crowdfunding_campaigns add column if not exists status text;

alter table public.crypto_rewards add column if not exists created_at timestamptz default now();
alter table public.crypto_rewards add column if not exists updated_at timestamptz default now();
alter table public.crypto_rewards add column if not exists created_date timestamptz default now();
alter table public.crypto_rewards add column if not exists distributed_at timestamptz;
alter table public.crypto_rewards add column if not exists status text;
alter table public.crypto_rewards add column if not exists user_email text;

alter table public.crypto_transactions add column if not exists created_at timestamptz default now();
alter table public.crypto_transactions add column if not exists updated_at timestamptz default now();
alter table public.crypto_transactions add column if not exists created_date timestamptz default now();
alter table public.crypto_transactions add column if not exists amount numeric;
alter table public.crypto_transactions add column if not exists blockchain_tx_hash text;
alter table public.crypto_transactions add column if not exists currency text;
alter table public.crypto_transactions add column if not exists exchange_rate numeric;
alter table public.crypto_transactions add column if not exists fee numeric;
alter table public.crypto_transactions add column if not exists from_amount numeric;
alter table public.crypto_transactions add column if not exists from_currency text;
alter table public.crypto_transactions add column if not exists memo text;
alter table public.crypto_transactions add column if not exists recipient_address text;
alter table public.crypto_transactions add column if not exists status text;
alter table public.crypto_transactions add column if not exists to_amount numeric;
alter table public.crypto_transactions add column if not exists to_currency text;
alter table public.crypto_transactions add column if not exists transaction_type text;
alter table public.crypto_transactions add column if not exists usd_value numeric;
alter table public.crypto_transactions add column if not exists user_email text;

alter table public.crypto_wallets add column if not exists created_at timestamptz default now();
alter table public.crypto_wallets add column if not exists updated_at timestamptz default now();
alter table public.crypto_wallets add column if not exists created_date timestamptz default now();
alter table public.crypto_wallets add column if not exists balance numeric;
alter table public.crypto_wallets add column if not exists currency text;
alter table public.crypto_wallets add column if not exists is_active boolean;
alter table public.crypto_wallets add column if not exists user_email text;
alter table public.crypto_wallets add column if not exists wallet_address text;

alter table public.damage_settlements add column if not exists created_at timestamptz default now();
alter table public.damage_settlements add column if not exists updated_at timestamptz default now();
alter table public.damage_settlements add column if not exists created_date timestamptz default now();
alter table public.damage_settlements add column if not exists owner_email text;
alter table public.damage_settlements add column if not exists owner_response text;
alter table public.damage_settlements add column if not exists resolved_at timestamptz;
alter table public.damage_settlements add column if not exists settlement_amount numeric;
alter table public.damage_settlements add column if not exists status text;

alter table public.defi_positions add column if not exists created_at timestamptz default now();
alter table public.defi_positions add column if not exists updated_at timestamptz default now();
alter table public.defi_positions add column if not exists created_date timestamptz default now();
alter table public.defi_positions add column if not exists status text;
alter table public.defi_positions add column if not exists user_email text;

alter table public.delivery_franchises add column if not exists created_at timestamptz default now();
alter table public.delivery_franchises add column if not exists updated_at timestamptz default now();
alter table public.delivery_franchises add column if not exists created_date timestamptz default now();
alter table public.delivery_franchises add column if not exists owner_email text;

alter table public.delivery_orders add column if not exists created_at timestamptz default now();
alter table public.delivery_orders add column if not exists updated_at timestamptz default now();
alter table public.delivery_orders add column if not exists created_date timestamptz default now();
alter table public.delivery_orders add column if not exists conversation_id uuid;
alter table public.delivery_orders add column if not exists driver_email text;
alter table public.delivery_orders add column if not exists rating numeric;
alter table public.delivery_orders add column if not exists recipient_email text;
alter table public.delivery_orders add column if not exists review text;
alter table public.delivery_orders add column if not exists review_time timestamptz;
alter table public.delivery_orders add column if not exists sender_email text;
alter table public.delivery_orders add column if not exists status text;
alter table public.delivery_orders add column if not exists tracking_updates jsonb;

alter table public.delivery_vehicles add column if not exists created_at timestamptz default now();
alter table public.delivery_vehicles add column if not exists updated_at timestamptz default now();
alter table public.delivery_vehicles add column if not exists created_date timestamptz default now();
alter table public.delivery_vehicles add column if not exists driver_email text;
alter table public.delivery_vehicles add column if not exists is_active boolean;

alter table public.digital_products add column if not exists created_at timestamptz default now();
alter table public.digital_products add column if not exists updated_at timestamptz default now();
alter table public.digital_products add column if not exists created_date timestamptz default now();
alter table public.digital_products add column if not exists created_by text;
alter table public.digital_products add column if not exists creator_email text;
alter table public.digital_products add column if not exists creator_name text;
alter table public.digital_products add column if not exists is_active boolean;
alter table public.digital_products add column if not exists rating numeric;
alter table public.digital_products add column if not exists revenue numeric;
alter table public.digital_products add column if not exists sales_count integer;
alter table public.digital_products add column if not exists total_sales integer;

alter table public.direct_messages add column if not exists created_at timestamptz default now();
alter table public.direct_messages add column if not exists updated_at timestamptz default now();
alter table public.direct_messages add column if not exists created_date timestamptz default now();
alter table public.direct_messages add column if not exists content text;
alter table public.direct_messages add column if not exists conversation_id uuid;
alter table public.direct_messages add column if not exists is_deleted boolean;
alter table public.direct_messages add column if not exists is_edited boolean;
alter table public.direct_messages add column if not exists reactions jsonb;
alter table public.direct_messages add column if not exists read boolean;
alter table public.direct_messages add column if not exists read_at timestamptz;
alter table public.direct_messages add column if not exists recipient_email text;
alter table public.direct_messages add column if not exists reference_id uuid;
alter table public.direct_messages add column if not exists reference_type text;
alter table public.direct_messages add column if not exists sender_email text;
alter table public.direct_messages add column if not exists sender_name text;
alter table public.direct_messages add column if not exists sender_photo text;

alter table public.disputes add column if not exists created_at timestamptz default now();
alter table public.disputes add column if not exists updated_at timestamptz default now();
alter table public.disputes add column if not exists created_date timestamptz default now();
alter table public.disputes add column if not exists ai_analysis jsonb;
alter table public.disputes add column if not exists amount_disputed numeric;
alter table public.disputes add column if not exists complainant_email text;
alter table public.disputes add column if not exists description text;
alter table public.disputes add column if not exists dispute_type text;
alter table public.disputes add column if not exists disputer_email text;
alter table public.disputes add column if not exists disputer_type text;
alter table public.disputes add column if not exists escalation_type text;
alter table public.disputes add column if not exists evidence_urls jsonb;
alter table public.disputes add column if not exists initiator_email text;
alter table public.disputes add column if not exists initiator_name text;
alter table public.disputes add column if not exists lease_id uuid;
alter table public.disputes add column if not exists property_id uuid;
alter table public.disputes add column if not exists reason text;
alter table public.disputes add column if not exists reference_id uuid;
alter table public.disputes add column if not exists reference_type text;
alter table public.disputes add column if not exists resolution text;
alter table public.disputes add column if not exists resolution_notes text;
alter table public.disputes add column if not exists resolved_at timestamptz;
alter table public.disputes add column if not exists resolved_by text;
alter table public.disputes add column if not exists respondent_email text;
alter table public.disputes add column if not exists respondent_name text;
alter table public.disputes add column if not exists severity text;
alter table public.disputes add column if not exists status text;

alter table public.document_comments add column if not exists created_at timestamptz default now();
alter table public.document_comments add column if not exists updated_at timestamptz default now();
alter table public.document_comments add column if not exists created_date timestamptz default now();
alter table public.document_comments add column if not exists document_id uuid;
alter table public.document_comments add column if not exists is_resolved boolean;
alter table public.document_comments add column if not exists resolved_at timestamptz;
alter table public.document_comments add column if not exists resolved_by text;

alter table public.document_presences add column if not exists created_at timestamptz default now();
alter table public.document_presences add column if not exists updated_at timestamptz default now();
alter table public.document_presences add column if not exists created_date timestamptz default now();
alter table public.document_presences add column if not exists document_id uuid;
alter table public.document_presences add column if not exists is_editing boolean;
alter table public.document_presences add column if not exists user_email text;

alter table public.donations add column if not exists created_at timestamptz default now();
alter table public.donations add column if not exists updated_at timestamptz default now();
alter table public.donations add column if not exists created_date timestamptz default now();
alter table public.donations add column if not exists raised_usd numeric;

alter table public.driver_ratings add column if not exists created_at timestamptz default now();
alter table public.driver_ratings add column if not exists updated_at timestamptz default now();
alter table public.driver_ratings add column if not exists created_date timestamptz default now();
alter table public.driver_ratings add column if not exists categories jsonb;
alter table public.driver_ratings add column if not exists driver_email text;
alter table public.driver_ratings add column if not exists passenger_email text;
alter table public.driver_ratings add column if not exists passenger_name text;
alter table public.driver_ratings add column if not exists passenger_photo text;
alter table public.driver_ratings add column if not exists rating numeric;
alter table public.driver_ratings add column if not exists review_text text;
alter table public.driver_ratings add column if not exists ride_id uuid;
alter table public.driver_ratings add column if not exists would_ride_again text;

alter table public.driver_stats add column if not exists created_at timestamptz default now();
alter table public.driver_stats add column if not exists updated_at timestamptz default now();
alter table public.driver_stats add column if not exists created_date timestamptz default now();
alter table public.driver_stats add column if not exists cancellation_rate numeric;
alter table public.driver_stats add column if not exists cancellations integer;
alter table public.driver_stats add column if not exists driver_email text;
alter table public.driver_stats add column if not exists pending_payout numeric;
alter table public.driver_stats add column if not exists period_date timestamptz;
alter table public.driver_stats add column if not exists period_type text;

alter table public.entertainment_tickets add column if not exists created_at timestamptz default now();
alter table public.entertainment_tickets add column if not exists updated_at timestamptz default now();
alter table public.entertainment_tickets add column if not exists created_date timestamptz default now();
alter table public.entertainment_tickets add column if not exists buyer_email text;
alter table public.entertainment_tickets add column if not exists event_date timestamptz;
alter table public.entertainment_tickets add column if not exists event_time text;
alter table public.entertainment_tickets add column if not exists is_pass boolean;
alter table public.entertainment_tickets add column if not exists pass_perks text;
alter table public.entertainment_tickets add column if not exists pass_type text;
alter table public.entertainment_tickets add column if not exists pass_valid_from text;
alter table public.entertainment_tickets add column if not exists pass_valid_until text;
alter table public.entertainment_tickets add column if not exists pass_visits_allowed boolean;
alter table public.entertainment_tickets add column if not exists pass_visits_used integer;
alter table public.entertainment_tickets add column if not exists price_paid numeric;
alter table public.entertainment_tickets add column if not exists provider_email text;
alter table public.entertainment_tickets add column if not exists redeemed_at timestamptz;
alter table public.entertainment_tickets add column if not exists redeemed_by text;
alter table public.entertainment_tickets add column if not exists redemption_history jsonb;
alter table public.entertainment_tickets add column if not exists refund_amount numeric;
alter table public.entertainment_tickets add column if not exists special_instructions text;
alter table public.entertainment_tickets add column if not exists status text;
alter table public.entertainment_tickets add column if not exists ticket_number text;
alter table public.entertainment_tickets add column if not exists ticket_type text;
alter table public.entertainment_tickets add column if not exists verification_timestamp timestamptz;

alter table public.error_logs add column if not exists created_at timestamptz default now();
alter table public.error_logs add column if not exists updated_at timestamptz default now();
alter table public.error_logs add column if not exists created_date timestamptz default now();
alter table public.error_logs add column if not exists component_stack text;
alter table public.error_logs add column if not exists error_message text;
alter table public.error_logs add column if not exists error_stack text;
alter table public.error_logs add column if not exists error_type text;
alter table public.error_logs add column if not exists resolved boolean;
alter table public.error_logs add column if not exists url text;
alter table public.error_logs add column if not exists user_agent text;
alter table public.error_logs add column if not exists user_email text;

alter table public.escrow_transactions add column if not exists created_at timestamptz default now();
alter table public.escrow_transactions add column if not exists updated_at timestamptz default now();
alter table public.escrow_transactions add column if not exists created_date timestamptz default now();

alter table public.events add column if not exists created_at timestamptz default now();
alter table public.events add column if not exists updated_at timestamptz default now();
alter table public.events add column if not exists created_date timestamptz default now();
alter table public.events add column if not exists capacity text;
alter table public.events add column if not exists comments_count integer;
alter table public.events add column if not exists liked_by jsonb;
alter table public.events add column if not exists likes_count integer;
alter table public.events add column if not exists organizer_email text;
alter table public.events add column if not exists organizer_name text;
alter table public.events add column if not exists organizer_photo text;
alter table public.events add column if not exists saved_by jsonb;
alter table public.events add column if not exists saves_count integer;
alter table public.events add column if not exists shares_count integer;
alter table public.events add column if not exists status text;
alter table public.events add column if not exists tags jsonb;
alter table public.events add column if not exists ticket_price numeric;
alter table public.events add column if not exists views integer;

alter table public.experiences add column if not exists created_at timestamptz default now();
alter table public.experiences add column if not exists updated_at timestamptz default now();
alter table public.experiences add column if not exists created_date timestamptz default now();
alter table public.experiences add column if not exists booking_date timestamptz;
alter table public.experiences add column if not exists calendar_sync_enabled boolean;
alter table public.experiences add column if not exists category text;
alter table public.experiences add column if not exists customer_email text;
alter table public.experiences add column if not exists google_calendar_id text;
alter table public.experiences add column if not exists is_active boolean;
alter table public.experiences add column if not exists price numeric;
alter table public.experiences add column if not exists provider_email text;
alter table public.experiences add column if not exists status text;
alter table public.experiences add column if not exists title text;

alter table public.failed_payments add column if not exists created_at timestamptz default now();
alter table public.failed_payments add column if not exists updated_at timestamptz default now();
alter table public.failed_payments add column if not exists created_date timestamptz default now();

alter table public.fan_pools add column if not exists created_at timestamptz default now();
alter table public.fan_pools add column if not exists updated_at timestamptz default now();
alter table public.fan_pools add column if not exists created_date timestamptz default now();
alter table public.fan_pools add column if not exists artist_email text;
alter table public.fan_pools add column if not exists artist_name text;
alter table public.fan_pools add column if not exists contributors jsonb;
alter table public.fan_pools add column if not exists raised_amount numeric;
alter table public.fan_pools add column if not exists status text;
alter table public.fan_pools add column if not exists tier_rewards jsonb;

alter table public.follow_requests add column if not exists created_at timestamptz default now();
alter table public.follow_requests add column if not exists updated_at timestamptz default now();
alter table public.follow_requests add column if not exists created_date timestamptz default now();
alter table public.follow_requests add column if not exists from_email text;
alter table public.follow_requests add column if not exists from_name text;
alter table public.follow_requests add column if not exists from_photo text;
alter table public.follow_requests add column if not exists status text;
alter table public.follow_requests add column if not exists to_email text;

alter table public.follows add column if not exists created_at timestamptz default now();
alter table public.follows add column if not exists updated_at timestamptz default now();
alter table public.follows add column if not exists created_date timestamptz default now();
alter table public.follows add column if not exists follower_email text;
alter table public.follows add column if not exists follower_name text;
alter table public.follows add column if not exists following_email text;
alter table public.follows add column if not exists following_name text;

alter table public.food_orders add column if not exists created_at timestamptz default now();
alter table public.food_orders add column if not exists updated_at timestamptz default now();
alter table public.food_orders add column if not exists created_date timestamptz default now();
alter table public.food_orders add column if not exists commission_amount numeric;
alter table public.food_orders add column if not exists created_by text;
alter table public.food_orders add column if not exists delivery_address text;
alter table public.food_orders add column if not exists delivery_fee numeric;
alter table public.food_orders add column if not exists driver_earnings numeric;
alter table public.food_orders add column if not exists driver_email text;
alter table public.food_orders add column if not exists driver_name text;
alter table public.food_orders add column if not exists estimated_delivery_time timestamptz;
alter table public.food_orders add column if not exists items integer;
alter table public.food_orders add column if not exists owner_email text;
alter table public.food_orders add column if not exists payment_settled boolean;
alter table public.food_orders add column if not exists restaurant_address text;
alter table public.food_orders add column if not exists restaurant_id uuid;
alter table public.food_orders add column if not exists restaurant_name text;
alter table public.food_orders add column if not exists restaurant_owner_email text;
alter table public.food_orders add column if not exists restaurant_phone text;
alter table public.food_orders add column if not exists special_instructions text;
alter table public.food_orders add column if not exists status text;
alter table public.food_orders add column if not exists subtotal numeric;
alter table public.food_orders add column if not exists total numeric;
alter table public.food_orders add column if not exists total_amount numeric;
alter table public.food_orders add column if not exists user_email text;

alter table public.forum_groups add column if not exists created_at timestamptz default now();
alter table public.forum_groups add column if not exists updated_at timestamptz default now();
alter table public.forum_groups add column if not exists created_date timestamptz default now();
alter table public.forum_groups add column if not exists creator_email text;
alter table public.forum_groups add column if not exists creator_name text;
alter table public.forum_groups add column if not exists is_active boolean;
alter table public.forum_groups add column if not exists member_count integer;
alter table public.forum_groups add column if not exists members jsonb;
alter table public.forum_groups add column if not exists rules text;
alter table public.forum_groups add column if not exists thread_count integer;

alter table public.forum_likes add column if not exists created_at timestamptz default now();
alter table public.forum_likes add column if not exists updated_at timestamptz default now();
alter table public.forum_likes add column if not exists created_date timestamptz default now();

alter table public.forum_posts add column if not exists created_at timestamptz default now();
alter table public.forum_posts add column if not exists updated_at timestamptz default now();
alter table public.forum_posts add column if not exists created_date timestamptz default now();

alter table public.forum_replies add column if not exists created_at timestamptz default now();
alter table public.forum_replies add column if not exists updated_at timestamptz default now();
alter table public.forum_replies add column if not exists created_date timestamptz default now();
alter table public.forum_replies add column if not exists content text;
alter table public.forum_replies add column if not exists likes jsonb;
alter table public.forum_replies add column if not exists thread_id uuid;
alter table public.forum_replies add column if not exists user_email text;
alter table public.forum_replies add column if not exists user_name text;
alter table public.forum_replies add column if not exists user_photo text;

alter table public.forum_threads add column if not exists created_at timestamptz default now();
alter table public.forum_threads add column if not exists updated_at timestamptz default now();
alter table public.forum_threads add column if not exists created_date timestamptz default now();
alter table public.forum_threads add column if not exists author_email text;
alter table public.forum_threads add column if not exists author_name text;
alter table public.forum_threads add column if not exists author_photo text;
alter table public.forum_threads add column if not exists followers jsonb;
alter table public.forum_threads add column if not exists group_id uuid;
alter table public.forum_threads add column if not exists group_name text;
alter table public.forum_threads add column if not exists last_reply_at timestamptz;
alter table public.forum_threads add column if not exists last_reply_by text;
alter table public.forum_threads add column if not exists likes jsonb;
alter table public.forum_threads add column if not exists reply_count integer;

alter table public.friend_requests add column if not exists created_at timestamptz default now();
alter table public.friend_requests add column if not exists updated_at timestamptz default now();
alter table public.friend_requests add column if not exists created_date timestamptz default now();
alter table public.friend_requests add column if not exists from_email text;
alter table public.friend_requests add column if not exists from_name text;
alter table public.friend_requests add column if not exists message text;
alter table public.friend_requests add column if not exists status text;
alter table public.friend_requests add column if not exists to_email text;

alter table public.friendships add column if not exists created_at timestamptz default now();
alter table public.friendships add column if not exists updated_at timestamptz default now();
alter table public.friendships add column if not exists created_date timestamptz default now();
alter table public.friendships add column if not exists status text;
alter table public.friendships add column if not exists user1_email text;
alter table public.friendships add column if not exists user2_email text;

alter table public.game_items add column if not exists created_at timestamptz default now();
alter table public.game_items add column if not exists updated_at timestamptz default now();
alter table public.game_items add column if not exists created_date timestamptz default now();
alter table public.game_items add column if not exists game_name text;
alter table public.game_items add column if not exists is_active boolean;

alter table public.game_premium_subscriptions add column if not exists created_at timestamptz default now();
alter table public.game_premium_subscriptions add column if not exists updated_at timestamptz default now();
alter table public.game_premium_subscriptions add column if not exists created_date timestamptz default now();
alter table public.game_premium_subscriptions add column if not exists benefits jsonb;
alter table public.game_premium_subscriptions add column if not exists end_date timestamptz;
alter table public.game_premium_subscriptions add column if not exists is_active boolean;
alter table public.game_premium_subscriptions add column if not exists price_paid numeric;
alter table public.game_premium_subscriptions add column if not exists start_date timestamptz;
alter table public.game_premium_subscriptions add column if not exists subscription_tier text;
alter table public.game_premium_subscriptions add column if not exists user_email text;

alter table public.game_scores add column if not exists created_at timestamptz default now();
alter table public.game_scores add column if not exists updated_at timestamptz default now();
alter table public.game_scores add column if not exists created_date timestamptz default now();
alter table public.game_scores add column if not exists duration_seconds integer;
alter table public.game_scores add column if not exists game_name text;
alter table public.game_scores add column if not exists level_reached integer;
alter table public.game_scores add column if not exists reward_earned numeric;
alter table public.game_scores add column if not exists score numeric;
alter table public.game_scores add column if not exists user_email text;

alter table public.game_sessions add column if not exists created_at timestamptz default now();
alter table public.game_sessions add column if not exists updated_at timestamptz default now();
alter table public.game_sessions add column if not exists created_date timestamptz default now();
alter table public.game_sessions add column if not exists game_name text;
alter table public.game_sessions add column if not exists host_email text;
alter table public.game_sessions add column if not exists max_players integer;
alter table public.game_sessions add column if not exists players jsonb;
alter table public.game_sessions add column if not exists status text;

alter table public.help_guides add column if not exists created_at timestamptz default now();
alter table public.help_guides add column if not exists updated_at timestamptz default now();
alter table public.help_guides add column if not exists created_date timestamptz default now();

alter table public.inventory_products add column if not exists created_at timestamptz default now();
alter table public.inventory_products add column if not exists updated_at timestamptz default now();
alter table public.inventory_products add column if not exists created_date timestamptz default now();
alter table public.inventory_products add column if not exists base_price numeric;
alter table public.inventory_products add column if not exists category text;
alter table public.inventory_products add column if not exists cost_price numeric;
alter table public.inventory_products add column if not exists description text;
alter table public.inventory_products add column if not exists last_restocked_at timestamptz;
alter table public.inventory_products add column if not exists low_stock_threshold integer;
alter table public.inventory_products add column if not exists name text;
alter table public.inventory_products add column if not exists owner_email text;
alter table public.inventory_products add column if not exists reorder_quantity integer;
alter table public.inventory_products add column if not exists sku text;
alter table public.inventory_products add column if not exists status text;
alter table public.inventory_products add column if not exists stock_quantity integer;
alter table public.inventory_products add column if not exists store_type text;
alter table public.inventory_products add column if not exists supplier_contact text;
alter table public.inventory_products add column if not exists supplier_name text;
alter table public.inventory_products add column if not exists tags jsonb;
alter table public.inventory_products add column if not exists track_inventory boolean;
alter table public.inventory_products add column if not exists variants jsonb;

alter table public.job_applications add column if not exists created_at timestamptz default now();
alter table public.job_applications add column if not exists updated_at timestamptz default now();
alter table public.job_applications add column if not exists created_date timestamptz default now();
alter table public.job_applications add column if not exists applied_date timestamptz;
alter table public.job_applications add column if not exists company_name text;
alter table public.job_applications add column if not exists job_category text;
alter table public.job_applications add column if not exists job_id uuid;
alter table public.job_applications add column if not exists job_location text;
alter table public.job_applications add column if not exists job_title text;
alter table public.job_applications add column if not exists job_type text;
alter table public.job_applications add column if not exists pay_rate numeric;
alter table public.job_applications add column if not exists poster_photo text;
alter table public.job_applications add column if not exists status text;
alter table public.job_applications add column if not exists user_email text;

alter table public.job_gigs add column if not exists created_at timestamptz default now();
alter table public.job_gigs add column if not exists updated_at timestamptz default now();
alter table public.job_gigs add column if not exists created_date timestamptz default now();
alter table public.job_gigs add column if not exists benefits jsonb;
alter table public.job_gigs add column if not exists poster_email text;
alter table public.job_gigs add column if not exists poster_name text;
alter table public.job_gigs add column if not exists poster_photo text;
alter table public.job_gigs add column if not exists requirements jsonb;
alter table public.job_gigs add column if not exists status text;

alter table public.lease_applications add column if not exists created_at timestamptz default now();
alter table public.lease_applications add column if not exists updated_at timestamptz default now();
alter table public.lease_applications add column if not exists created_date timestamptz default now();
alter table public.lease_applications add column if not exists applicant_email text;
alter table public.lease_applications add column if not exists applicant_name text;
alter table public.lease_applications add column if not exists credit_score integer;
alter table public.lease_applications add column if not exists current_address text;
alter table public.lease_applications add column if not exists employer_name text;
alter table public.lease_applications add column if not exists employment_status text;
alter table public.lease_applications add column if not exists has_pets boolean;
alter table public.lease_applications add column if not exists landlord_notes text;
alter table public.lease_applications add column if not exists monthly_income numeric;
alter table public.lease_applications add column if not exists move_in_date timestamptz;
alter table public.lease_applications add column if not exists num_occupants integer;
alter table public.lease_applications add column if not exists pet_details text;
alter table public.lease_applications add column if not exists phone text;
alter table public.lease_applications add column if not exists property_address text;
alter table public.lease_applications add column if not exists property_id uuid;
alter table public.lease_applications add column if not exists status text;

alter table public.lease_documents add column if not exists created_at timestamptz default now();
alter table public.lease_documents add column if not exists updated_at timestamptz default now();
alter table public.lease_documents add column if not exists created_date timestamptz default now();
alter table public.lease_documents add column if not exists document_name text;
alter table public.lease_documents add column if not exists document_type text;
alter table public.lease_documents add column if not exists document_url text;
alter table public.lease_documents add column if not exists file_size integer;
alter table public.lease_documents add column if not exists lease_id uuid;
alter table public.lease_documents add column if not exists notes text;
alter table public.lease_documents add column if not exists property_id uuid;

alter table public.leases add column if not exists created_at timestamptz default now();
alter table public.leases add column if not exists updated_at timestamptz default now();
alter table public.leases add column if not exists created_date timestamptz default now();
alter table public.leases add column if not exists application_id uuid;
alter table public.leases add column if not exists grace_period_days integer;
alter table public.leases add column if not exists landlord_email text;
alter table public.leases add column if not exists landlord_name text;
alter table public.leases add column if not exists landlord_signed boolean;
alter table public.leases add column if not exists late_fee_amount numeric;
alter table public.leases add column if not exists late_fee_max numeric;
alter table public.leases add column if not exists late_fee_type text;
alter table public.leases add column if not exists lease_end_date timestamptz;
alter table public.leases add column if not exists lease_start_date timestamptz;
alter table public.leases add column if not exists lease_term_months integer;
alter table public.leases add column if not exists monthly_rent numeric;
alter table public.leases add column if not exists move_in_fee numeric;
alter table public.leases add column if not exists pet_deposit numeric;
alter table public.leases add column if not exists pets_allowed boolean;
alter table public.leases add column if not exists property_address text;
alter table public.leases add column if not exists property_id uuid;
alter table public.leases add column if not exists rent_due_day integer;
alter table public.leases add column if not exists security_deposit numeric;
alter table public.leases add column if not exists status text;
alter table public.leases add column if not exists tenant_email text;
alter table public.leases add column if not exists tenant_name text;
alter table public.leases add column if not exists tenant_signed boolean;
alter table public.leases add column if not exists terms text;

alter table public.listening_histories add column if not exists created_at timestamptz default now();
alter table public.listening_histories add column if not exists updated_at timestamptz default now();
alter table public.listening_histories add column if not exists created_date timestamptz default now();
alter table public.listening_histories add column if not exists artist_name text;
alter table public.listening_histories add column if not exists cover_art_url text;
alter table public.listening_histories add column if not exists genre text;
alter table public.listening_histories add column if not exists played_at timestamptz;
alter table public.listening_histories add column if not exists source text;
alter table public.listening_histories add column if not exists track_id uuid;
alter table public.listening_histories add column if not exists track_title text;
alter table public.listening_histories add column if not exists user_email text;
alter table public.listening_histories add column if not exists video_id uuid;

alter table public.livestream_chat_messages add column if not exists created_at timestamptz default now();
alter table public.livestream_chat_messages add column if not exists updated_at timestamptz default now();
alter table public.livestream_chat_messages add column if not exists created_date timestamptz default now();
alter table public.livestream_chat_messages add column if not exists is_priority boolean;
alter table public.livestream_chat_messages add column if not exists message text;
alter table public.livestream_chat_messages add column if not exists stream_id uuid;
alter table public.livestream_chat_messages add column if not exists user_email text;
alter table public.livestream_chat_messages add column if not exists user_name text;

alter table public.livestream_chats add column if not exists created_at timestamptz default now();
alter table public.livestream_chats add column if not exists updated_at timestamptz default now();
alter table public.livestream_chats add column if not exists created_date timestamptz default now();
alter table public.livestream_chats add column if not exists badge_color text;
alter table public.livestream_chats add column if not exists is_deleted boolean;
alter table public.livestream_chats add column if not exists is_pinned boolean;
alter table public.livestream_chats add column if not exists is_priority boolean;
alter table public.livestream_chats add column if not exists message text;
alter table public.livestream_chats add column if not exists stream_id uuid;
alter table public.livestream_chats add column if not exists user_badge text;
alter table public.livestream_chats add column if not exists user_email text;
alter table public.livestream_chats add column if not exists user_name text;
alter table public.livestream_chats add column if not exists user_profile_picture text;

alter table public.livestream_polls add column if not exists created_at timestamptz default now();
alter table public.livestream_polls add column if not exists updated_at timestamptz default now();
alter table public.livestream_polls add column if not exists created_date timestamptz default now();
alter table public.livestream_polls add column if not exists creator_email text;
alter table public.livestream_polls add column if not exists ends_at timestamptz;
alter table public.livestream_polls add column if not exists options jsonb;
alter table public.livestream_polls add column if not exists status text;
alter table public.livestream_polls add column if not exists stream_id uuid;

alter table public.livestream_pricing_tiers add column if not exists created_at timestamptz default now();
alter table public.livestream_pricing_tiers add column if not exists updated_at timestamptz default now();
alter table public.livestream_pricing_tiers add column if not exists created_date timestamptz default now();
alter table public.livestream_pricing_tiers add column if not exists creator_email text;
alter table public.livestream_pricing_tiers add column if not exists current_purchases integer;
alter table public.livestream_pricing_tiers add column if not exists stream_id uuid;

alter table public.livestream_reactions add column if not exists created_at timestamptz default now();
alter table public.livestream_reactions add column if not exists updated_at timestamptz default now();
alter table public.livestream_reactions add column if not exists created_date timestamptz default now();
alter table public.livestream_reactions add column if not exists reaction_type text;
alter table public.livestream_reactions add column if not exists stream_id uuid;
alter table public.livestream_reactions add column if not exists user_email text;

alter table public.livestream_schedules add column if not exists created_at timestamptz default now();
alter table public.livestream_schedules add column if not exists updated_at timestamptz default now();
alter table public.livestream_schedules add column if not exists created_date timestamptz default now();
alter table public.livestream_schedules add column if not exists access_type text;
alter table public.livestream_schedules add column if not exists category text;
alter table public.livestream_schedules add column if not exists creator_email text;
alter table public.livestream_schedules add column if not exists description text;
alter table public.livestream_schedules add column if not exists duration_minutes integer;
alter table public.livestream_schedules add column if not exists is_recurring boolean;
alter table public.livestream_schedules add column if not exists member_discount_percent numeric;
alter table public.livestream_schedules add column if not exists ppv_price_usd numeric;
alter table public.livestream_schedules add column if not exists recurrence_end_date timestamptz;
alter table public.livestream_schedules add column if not exists recurrence_pattern text;
alter table public.livestream_schedules add column if not exists scheduled_time timestamptz;
alter table public.livestream_schedules add column if not exists status text;
alter table public.livestream_schedules add column if not exists stream_id uuid;
alter table public.livestream_schedules add column if not exists thumbnail_url text;
alter table public.livestream_schedules add column if not exists title text;

alter table public.livestream_tickets add column if not exists created_at timestamptz default now();
alter table public.livestream_tickets add column if not exists updated_at timestamptz default now();
alter table public.livestream_tickets add column if not exists created_date timestamptz default now();
alter table public.livestream_tickets add column if not exists amount_paid_soflo numeric;
alter table public.livestream_tickets add column if not exists amount_paid_usd numeric;
alter table public.livestream_tickets add column if not exists badge_color text;
alter table public.livestream_tickets add column if not exists chat_priority text;
alter table public.livestream_tickets add column if not exists creator_email text;
alter table public.livestream_tickets add column if not exists exclusive_badge text;
alter table public.livestream_tickets add column if not exists payment_method text;
alter table public.livestream_tickets add column if not exists payment_status text;
alter table public.livestream_tickets add column if not exists perks jsonb;
alter table public.livestream_tickets add column if not exists stream_id uuid;
alter table public.livestream_tickets add column if not exists tier_id uuid;
alter table public.livestream_tickets add column if not exists tier_name text;
alter table public.livestream_tickets add column if not exists user_email text;

alter table public.maintenance_requests add column if not exists created_at timestamptz default now();
alter table public.maintenance_requests add column if not exists updated_at timestamptz default now();
alter table public.maintenance_requests add column if not exists created_date timestamptz default now();
alter table public.maintenance_requests add column if not exists category text;
alter table public.maintenance_requests add column if not exists issue_description text;
alter table public.maintenance_requests add column if not exists issue_title text;
alter table public.maintenance_requests add column if not exists landlord_email text;
alter table public.maintenance_requests add column if not exists lease_id uuid;
alter table public.maintenance_requests add column if not exists photos jsonb;
alter table public.maintenance_requests add column if not exists priority text;
alter table public.maintenance_requests add column if not exists property_address text;
alter table public.maintenance_requests add column if not exists property_id uuid;
alter table public.maintenance_requests add column if not exists status text;
alter table public.maintenance_requests add column if not exists tenant_email text;
alter table public.maintenance_requests add column if not exists tenant_name text;

alter table public.marketplace_items add column if not exists created_at timestamptz default now();
alter table public.marketplace_items add column if not exists updated_at timestamptz default now();
alter table public.marketplace_items add column if not exists created_date timestamptz default now();
alter table public.marketplace_items add column if not exists availability text;
alter table public.marketplace_items add column if not exists category text;
alter table public.marketplace_items add column if not exists created_by text;
alter table public.marketplace_items add column if not exists description text;
alter table public.marketplace_items add column if not exists escrow_required boolean;
alter table public.marketplace_items add column if not exists image_url text;
alter table public.marketplace_items add column if not exists instant_booking boolean;
alter table public.marketplace_items add column if not exists is_rental boolean;
alter table public.marketplace_items add column if not exists location text;
alter table public.marketplace_items add column if not exists mileage_limit text;
alter table public.marketplace_items add column if not exists package_details text;
alter table public.marketplace_items add column if not exists price numeric;
alter table public.marketplace_items add column if not exists price_type text;
alter table public.marketplace_items add column if not exists provider_email text;
alter table public.marketplace_items add column if not exists provider_name text;
alter table public.marketplace_items add column if not exists rating numeric;
alter table public.marketplace_items add column if not exists reviews_count integer;
alter table public.marketplace_items add column if not exists security_deposit numeric;
alter table public.marketplace_items add column if not exists seller_email text;
alter table public.marketplace_items add column if not exists seller_name text;
alter table public.marketplace_items add column if not exists service_area text;
alter table public.marketplace_items add column if not exists status text;
alter table public.marketplace_items add column if not exists title text;
alter table public.marketplace_items add column if not exists verified_provider boolean;

alter table public.membership_subscriptions add column if not exists created_at timestamptz default now();
alter table public.membership_subscriptions add column if not exists updated_at timestamptz default now();
alter table public.membership_subscriptions add column if not exists created_date timestamptz default now();
alter table public.membership_subscriptions add column if not exists creator_email text;
alter table public.membership_subscriptions add column if not exists status text;
alter table public.membership_subscriptions add column if not exists user_email text;

alter table public.menu_items add column if not exists created_at timestamptz default now();
alter table public.menu_items add column if not exists updated_at timestamptz default now();
alter table public.menu_items add column if not exists created_date timestamptz default now();
alter table public.menu_items add column if not exists owner_email text;
alter table public.menu_items add column if not exists restaurant_id uuid;

alter table public.moderation_flags add column if not exists created_at timestamptz default now();
alter table public.moderation_flags add column if not exists updated_at timestamptz default now();
alter table public.moderation_flags add column if not exists created_date timestamptz default now();

alter table public.music_albums add column if not exists created_at timestamptz default now();
alter table public.music_albums add column if not exists updated_at timestamptz default now();
alter table public.music_albums add column if not exists created_date timestamptz default now();
alter table public.music_albums add column if not exists artist_email text;
alter table public.music_albums add column if not exists status text;

alter table public.music_contracts add column if not exists created_at timestamptz default now();
alter table public.music_contracts add column if not exists updated_at timestamptz default now();
alter table public.music_contracts add column if not exists created_date timestamptz default now();
alter table public.music_contracts add column if not exists ai_generated_terms jsonb;
alter table public.music_contracts add column if not exists contract_text text;
alter table public.music_contracts add column if not exists contract_type text;
alter table public.music_contracts add column if not exists parties jsonb;
alter table public.music_contracts add column if not exists status text;

alter table public.music_deal_applications add column if not exists created_at timestamptz default now();
alter table public.music_deal_applications add column if not exists updated_at timestamptz default now();
alter table public.music_deal_applications add column if not exists created_date timestamptz default now();
alter table public.music_deal_applications add column if not exists artist_email text;
alter table public.music_deal_applications add column if not exists artist_name text;
alter table public.music_deal_applications add column if not exists status text;

alter table public.music_distributions add column if not exists created_at timestamptz default now();
alter table public.music_distributions add column if not exists updated_at timestamptz default now();
alter table public.music_distributions add column if not exists created_date timestamptz default now();
alter table public.music_distributions add column if not exists artist_email text;

alter table public.music_masterings add column if not exists created_at timestamptz default now();
alter table public.music_masterings add column if not exists updated_at timestamptz default now();
alter table public.music_masterings add column if not exists created_date timestamptz default now();
alter table public.music_masterings add column if not exists approved_date timestamptz;
alter table public.music_masterings add column if not exists artist_email text;
alter table public.music_masterings add column if not exists status text;

alter table public.music_tracks add column if not exists created_at timestamptz default now();
alter table public.music_tracks add column if not exists updated_at timestamptz default now();
alter table public.music_tracks add column if not exists created_date timestamptz default now();
alter table public.music_tracks add column if not exists artist text;
alter table public.music_tracks add column if not exists artist_email text;
alter table public.music_tracks add column if not exists artist_name text;
alter table public.music_tracks add column if not exists music_video_url text;
alter table public.music_tracks add column if not exists status text;
alter table public.music_tracks add column if not exists stream_count integer;

alter table public.news_posts add column if not exists created_at timestamptz default now();
alter table public.news_posts add column if not exists updated_at timestamptz default now();
alter table public.news_posts add column if not exists created_date timestamptz default now();
alter table public.news_posts add column if not exists agora_channel_name text;
alter table public.news_posts add column if not exists author_email text;
alter table public.news_posts add column if not exists author_name text;
alter table public.news_posts add column if not exists author_photo text;
alter table public.news_posts add column if not exists is_live boolean;
alter table public.news_posts add column if not exists likes jsonb;
alter table public.news_posts add column if not exists live_ended_at timestamptz;
alter table public.news_posts add column if not exists live_started_at timestamptz;
alter table public.news_posts add column if not exists live_viewers text;
alter table public.news_posts add column if not exists status text;

alter table public.notification_preferences add column if not exists created_at timestamptz default now();
alter table public.notification_preferences add column if not exists updated_at timestamptz default now();
alter table public.notification_preferences add column if not exists created_date timestamptz default now();
alter table public.notification_preferences add column if not exists user_email text;

alter table public.notifications add column if not exists created_at timestamptz default now();
alter table public.notifications add column if not exists updated_at timestamptz default now();
alter table public.notifications add column if not exists created_date timestamptz default now();
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists metadata jsonb;
alter table public.notifications add column if not exists priority text;
alter table public.notifications add column if not exists read boolean;
alter table public.notifications add column if not exists recipient_email text;
alter table public.notifications add column if not exists reference_id uuid;
alter table public.notifications add column if not exists reference_type text;
alter table public.notifications add column if not exists related_id uuid;
alter table public.notifications add column if not exists sender_email text;
alter table public.notifications add column if not exists sender_name text;
alter table public.notifications add column if not exists sender_photo text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists user_email text;

alter table public.onboarding_progress add column if not exists created_at timestamptz default now();
alter table public.onboarding_progress add column if not exists updated_at timestamptz default now();
alter table public.onboarding_progress add column if not exists created_date timestamptz default now();
alter table public.onboarding_progress add column if not exists onboarding_type text;
alter table public.onboarding_progress add column if not exists user_email text;

alter table public.orders add column if not exists created_at timestamptz default now();
alter table public.orders add column if not exists updated_at timestamptz default now();
alter table public.orders add column if not exists created_date timestamptz default now();
alter table public.orders add column if not exists customer_notes text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists fulfillment_method text;
alter table public.orders add column if not exists handling_fee numeric;
alter table public.orders add column if not exists item_id uuid;
alter table public.orders add column if not exists item_price numeric;
alter table public.orders add column if not exists item_title text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists order_type text;
alter table public.orders add column if not exists payment_intent_id text;
alter table public.orders add column if not exists pickup text;
alter table public.orders add column if not exists pickup_location text;
alter table public.orders add column if not exists pickup_notification_sent boolean;
alter table public.orders add column if not exists pickup_ready_at timestamptz;
alter table public.orders add column if not exists platform_fee numeric;
alter table public.orders add column if not exists product_id uuid;
alter table public.orders add column if not exists product_name text;
alter table public.orders add column if not exists provider_email text;
alter table public.orders add column if not exists quantity integer;
alter table public.orders add column if not exists shipping_address text;
alter table public.orders add column if not exists shipping_carrier text;
alter table public.orders add column if not exists shipping_cost numeric;
alter table public.orders add column if not exists status text;
alter table public.orders add column if not exists subtotal numeric;
alter table public.orders add column if not exists total_amount numeric;
alter table public.orders add column if not exists total_usd numeric;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists user_email text;

alter table public.p2p_escrows add column if not exists created_at timestamptz default now();
alter table public.p2p_escrows add column if not exists updated_at timestamptz default now();
alter table public.p2p_escrows add column if not exists created_date timestamptz default now();
alter table public.p2p_escrows add column if not exists admin_notes text;
alter table public.p2p_escrows add column if not exists buyer_email text;
alter table public.p2p_escrows add column if not exists crypto_amount numeric;
alter table public.p2p_escrows add column if not exists crypto_currency text;
alter table public.p2p_escrows add column if not exists dispute_reason text;
alter table public.p2p_escrows add column if not exists fiat_amount numeric;
alter table public.p2p_escrows add column if not exists order_id uuid;
alter table public.p2p_escrows add column if not exists payment_confirmed_at timestamptz;
alter table public.p2p_escrows add column if not exists payment_method text;
alter table public.p2p_escrows add column if not exists seller_email text;
alter table public.p2p_escrows add column if not exists status text;

alter table public.p2p_orders add column if not exists created_at timestamptz default now();
alter table public.p2p_orders add column if not exists updated_at timestamptz default now();
alter table public.p2p_orders add column if not exists created_date timestamptz default now();
alter table public.p2p_orders add column if not exists buyer_email text;
alter table public.p2p_orders add column if not exists completed_at timestamptz;
alter table public.p2p_orders add column if not exists crypto_amount numeric;
alter table public.p2p_orders add column if not exists crypto_currency text;
alter table public.p2p_orders add column if not exists escrow_id uuid;
alter table public.p2p_orders add column if not exists fiat_currency text;
alter table public.p2p_orders add column if not exists item_category text;
alter table public.p2p_orders add column if not exists item_title text;
alter table public.p2p_orders add column if not exists item_type text;
alter table public.p2p_orders add column if not exists matched_at timestamptz;
alter table public.p2p_orders add column if not exists order_type text;
alter table public.p2p_orders add column if not exists original_price numeric;
alter table public.p2p_orders add column if not exists payment_method text;
alter table public.p2p_orders add column if not exists price_per_unit numeric;
alter table public.p2p_orders add column if not exists rated boolean;
alter table public.p2p_orders add column if not exists seller_email text;
alter table public.p2p_orders add column if not exists status text;
alter table public.p2p_orders add column if not exists terms text;
alter table public.p2p_orders add column if not exists total_amount numeric;

alter table public.p2p_transactions add column if not exists created_at timestamptz default now();
alter table public.p2p_transactions add column if not exists updated_at timestamptz default now();
alter table public.p2p_transactions add column if not exists created_date timestamptz default now();

alter table public.password_entries add column if not exists created_at timestamptz default now();
alter table public.password_entries add column if not exists updated_at timestamptz default now();
alter table public.password_entries add column if not exists created_date timestamptz default now();
alter table public.password_entries add column if not exists category text;
alter table public.password_entries add column if not exists encrypted_password text;
alter table public.password_entries add column if not exists is_favorite boolean;
alter table public.password_entries add column if not exists notes text;
alter table public.password_entries add column if not exists title text;
alter table public.password_entries add column if not exists user_email text;
alter table public.password_entries add column if not exists username text;
alter table public.password_entries add column if not exists website text;

alter table public.payment_cards add column if not exists created_at timestamptz default now();
alter table public.payment_cards add column if not exists updated_at timestamptz default now();
alter table public.payment_cards add column if not exists created_date timestamptz default now();
alter table public.payment_cards add column if not exists billing_zip text;
alter table public.payment_cards add column if not exists brand text;
alter table public.payment_cards add column if not exists card_type text;
alter table public.payment_cards add column if not exists cardholder_name text;
alter table public.payment_cards add column if not exists exp_month integer;
alter table public.payment_cards add column if not exists exp_year integer;
alter table public.payment_cards add column if not exists is_primary boolean;
alter table public.payment_cards add column if not exists last4 text;
alter table public.payment_cards add column if not exists user_email text;

alter table public.payment_methods add column if not exists created_at timestamptz default now();
alter table public.payment_methods add column if not exists updated_at timestamptz default now();
alter table public.payment_methods add column if not exists created_date timestamptz default now();
alter table public.payment_methods add column if not exists is_default boolean;
alter table public.payment_methods add column if not exists status text;
alter table public.payment_methods add column if not exists user_email text;

alter table public.payment_requests add column if not exists created_at timestamptz default now();
alter table public.payment_requests add column if not exists updated_at timestamptz default now();
alter table public.payment_requests add column if not exists created_date timestamptz default now();
alter table public.payment_requests add column if not exists amount numeric;
alter table public.payment_requests add column if not exists note text;
alter table public.payment_requests add column if not exists original_payment_id text;
alter table public.payment_requests add column if not exists payer_email text;
alter table public.payment_requests add column if not exists payer_name text;
alter table public.payment_requests add column if not exists request_type text;
alter table public.payment_requests add column if not exists requester_email text;
alter table public.payment_requests add column if not exists requester_name text;
alter table public.payment_requests add column if not exists responded_at timestamptz;
alter table public.payment_requests add column if not exists status text;

alter table public.payments add column if not exists created_at timestamptz default now();
alter table public.payments add column if not exists updated_at timestamptz default now();
alter table public.payments add column if not exists created_date timestamptz default now();
alter table public.payments add column if not exists amount numeric;
alter table public.payments add column if not exists amount_rri numeric;
alter table public.payments add column if not exists amount_usd numeric;
alter table public.payments add column if not exists created_by text;
alter table public.payments add column if not exists currency text;
alter table public.payments add column if not exists description text;
alter table public.payments add column if not exists is_active boolean;
alter table public.payments add column if not exists item_id uuid;
alter table public.payments add column if not exists item_type text;
alter table public.payments add column if not exists memo text;
alter table public.payments add column if not exists metadata jsonb;
alter table public.payments add column if not exists method text;
alter table public.payments add column if not exists next_execution_date timestamptz;
alter table public.payments add column if not exists payer_email text;
alter table public.payments add column if not exists payment_method text;
alter table public.payments add column if not exists payment_type text;
alter table public.payments add column if not exists receiver_email text;
alter table public.payments add column if not exists recipient_email text;
alter table public.payments add column if not exists reference_id uuid;
alter table public.payments add column if not exists reference_type text;
alter table public.payments add column if not exists sender_email text;
alter table public.payments add column if not exists status text;
alter table public.payments add column if not exists transaction_type text;

alter table public.payout_methods add column if not exists created_at timestamptz default now();
alter table public.payout_methods add column if not exists updated_at timestamptz default now();
alter table public.payout_methods add column if not exists created_date timestamptz default now();
alter table public.payout_methods add column if not exists is_primary boolean;
alter table public.payout_methods add column if not exists method_type text;
alter table public.payout_methods add column if not exists status text;
alter table public.payout_methods add column if not exists user_email text;

alter table public.payout_requests add column if not exists created_at timestamptz default now();
alter table public.payout_requests add column if not exists updated_at timestamptz default now();
alter table public.payout_requests add column if not exists created_date timestamptz default now();
alter table public.payout_requests add column if not exists amount numeric;
alter table public.payout_requests add column if not exists method_type text;
alter table public.payout_requests add column if not exists net_amount numeric;
alter table public.payout_requests add column if not exists payout_method_id uuid;
alter table public.payout_requests add column if not exists platform_fee numeric;
alter table public.payout_requests add column if not exists processing_fee numeric;
alter table public.payout_requests add column if not exists provider_email text;
alter table public.payout_requests add column if not exists requested_date timestamptz;
alter table public.payout_requests add column if not exists revenue_breakdown jsonb;
alter table public.payout_requests add column if not exists status text;
alter table public.payout_requests add column if not exists user_email text;

alter table public.physical_card_requests add column if not exists created_at timestamptz default now();
alter table public.physical_card_requests add column if not exists updated_at timestamptz default now();
alter table public.physical_card_requests add column if not exists created_date timestamptz default now();
alter table public.physical_card_requests add column if not exists user_email text;

alter table public.playlists add column if not exists created_at timestamptz default now();
alter table public.playlists add column if not exists updated_at timestamptz default now();
alter table public.playlists add column if not exists created_date timestamptz default now();
alter table public.playlists add column if not exists is_public boolean;
alter table public.playlists add column if not exists owner_email text;
alter table public.playlists add column if not exists title text;
alter table public.playlists add column if not exists video_ids jsonb;

alter table public.poll_votes add column if not exists created_at timestamptz default now();
alter table public.poll_votes add column if not exists updated_at timestamptz default now();
alter table public.poll_votes add column if not exists created_date timestamptz default now();
alter table public.poll_votes add column if not exists option_id uuid;
alter table public.poll_votes add column if not exists poll_id uuid;
alter table public.poll_votes add column if not exists user_email text;

alter table public.portfolio_items add column if not exists created_at timestamptz default now();
alter table public.portfolio_items add column if not exists updated_at timestamptz default now();
alter table public.portfolio_items add column if not exists created_date timestamptz default now();
alter table public.portfolio_items add column if not exists is_featured boolean;
alter table public.portfolio_items add column if not exists user_email text;

alter table public.ppv_contents add column if not exists created_at timestamptz default now();
alter table public.ppv_contents add column if not exists updated_at timestamptz default now();
alter table public.ppv_contents add column if not exists created_date timestamptz default now();
alter table public.ppv_contents add column if not exists creator_email text;
alter table public.ppv_contents add column if not exists is_active boolean;
alter table public.ppv_contents add column if not exists revenue_generated numeric;
alter table public.ppv_contents add column if not exists total_purchases integer;

alter table public.ppv_purchases add column if not exists created_at timestamptz default now();
alter table public.ppv_purchases add column if not exists updated_at timestamptz default now();
alter table public.ppv_purchases add column if not exists created_date timestamptz default now();
alter table public.ppv_purchases add column if not exists access_expires_at timestamptz;
alter table public.ppv_purchases add column if not exists amount_paid_rri numeric;
alter table public.ppv_purchases add column if not exists amount_paid_usd numeric;
alter table public.ppv_purchases add column if not exists creator_email text;
alter table public.ppv_purchases add column if not exists payment_method text;
alter table public.ppv_purchases add column if not exists ppv_content_id uuid;
alter table public.ppv_purchases add column if not exists user_email text;

alter table public.properties add column if not exists created_at timestamptz default now();
alter table public.properties add column if not exists updated_at timestamptz default now();
alter table public.properties add column if not exists created_date timestamptz default now();
alter table public.properties add column if not exists created_by text;
alter table public.properties add column if not exists rating numeric;
alter table public.properties add column if not exists reviews_count integer;

alter table public.property_bookings add column if not exists created_at timestamptz default now();
alter table public.property_bookings add column if not exists updated_at timestamptz default now();
alter table public.property_bookings add column if not exists created_date timestamptz default now();
alter table public.property_bookings add column if not exists doc_rejection_reason text;
alter table public.property_bookings add column if not exists doc_verification_status text;
alter table public.property_bookings add column if not exists doc_verified_at timestamptz;
alter table public.property_bookings add column if not exists doc_verified_by text;
alter table public.property_bookings add column if not exists host_email text;
alter table public.property_bookings add column if not exists house_rules_accepted boolean;
alter table public.property_bookings add column if not exists id_back_url text;
alter table public.property_bookings add column if not exists id_front_url text;
alter table public.property_bookings add column if not exists id_type text;
alter table public.property_bookings add column if not exists selfie_url text;
alter table public.property_bookings add column if not exists status text;

alter table public.provider_availabilities add column if not exists created_at timestamptz default now();
alter table public.provider_availabilities add column if not exists updated_at timestamptz default now();
alter table public.provider_availabilities add column if not exists created_date timestamptz default now();
alter table public.provider_availabilities add column if not exists day_of_week text;
alter table public.provider_availabilities add column if not exists provider_email text;

alter table public.provider_onboardings add column if not exists created_at timestamptz default now();
alter table public.provider_onboardings add column if not exists updated_at timestamptz default now();
alter table public.provider_onboardings add column if not exists created_date timestamptz default now();
alter table public.provider_onboardings add column if not exists provider_type text;
alter table public.provider_onboardings add column if not exists tooltips_dismissed boolean;
alter table public.provider_onboardings add column if not exists user_email text;

alter table public.provider_verifications add column if not exists created_at timestamptz default now();
alter table public.provider_verifications add column if not exists updated_at timestamptz default now();
alter table public.provider_verifications add column if not exists created_date timestamptz default now();
alter table public.provider_verifications add column if not exists document_url text;
alter table public.provider_verifications add column if not exists provider_email text;
alter table public.provider_verifications add column if not exists status text;
alter table public.provider_verifications add column if not exists verification_type text;

alter table public.qa_questions add column if not exists created_at timestamptz default now();
alter table public.qa_questions add column if not exists updated_at timestamptz default now();
alter table public.qa_questions add column if not exists created_date timestamptz default now();
alter table public.qa_questions add column if not exists answer text;
alter table public.qa_questions add column if not exists status text;
alter table public.qa_questions add column if not exists stream_id uuid;
alter table public.qa_questions add column if not exists upvotes integer;
alter table public.qa_questions add column if not exists user_email text;
alter table public.qa_questions add column if not exists user_name text;

alter table public.ratings add column if not exists created_at timestamptz default now();
alter table public.ratings add column if not exists updated_at timestamptz default now();
alter table public.ratings add column if not exists created_date timestamptz default now();
alter table public.ratings add column if not exists categories jsonb;
alter table public.ratings add column if not exists provider_email text;
alter table public.ratings add column if not exists rated_email text;
alter table public.ratings add column if not exists rater_email text;
alter table public.ratings add column if not exists rater_type text;
alter table public.ratings add column if not exists rating numeric;
alter table public.ratings add column if not exists review text;
alter table public.ratings add column if not exists ride_id uuid;

alter table public.reels add column if not exists created_at timestamptz default now();
alter table public.reels add column if not exists updated_at timestamptz default now();
alter table public.reels add column if not exists created_date timestamptz default now();
alter table public.reels add column if not exists audio_name text;
alter table public.reels add column if not exists caption text;
alter table public.reels add column if not exists comments_count integer;
alter table public.reels add column if not exists creator_email text;
alter table public.reels add column if not exists creator_name text;
alter table public.reels add column if not exists creator_photo text;
alter table public.reels add column if not exists is_public boolean;
alter table public.reels add column if not exists liked_by jsonb;
alter table public.reels add column if not exists likes_count integer;
alter table public.reels add column if not exists shares_count integer;
alter table public.reels add column if not exists tags jsonb;
alter table public.reels add column if not exists video_url text;
alter table public.reels add column if not exists views_count integer;

alter table public.rent_payments add column if not exists created_at timestamptz default now();
alter table public.rent_payments add column if not exists updated_at timestamptz default now();
alter table public.rent_payments add column if not exists created_date timestamptz default now();
alter table public.rent_payments add column if not exists amount numeric;
alter table public.rent_payments add column if not exists due_date timestamptz;
alter table public.rent_payments add column if not exists landlord_email text;
alter table public.rent_payments add column if not exists late_fee_applied boolean;
alter table public.rent_payments add column if not exists late_fee_waived boolean;
alter table public.rent_payments add column if not exists late_fee_waived_by text;
alter table public.rent_payments add column if not exists late_fee_waived_reason text;
alter table public.rent_payments add column if not exists lease_id uuid;
alter table public.rent_payments add column if not exists paid_date timestamptz;
alter table public.rent_payments add column if not exists payment_date timestamptz;
alter table public.rent_payments add column if not exists payment_method text;
alter table public.rent_payments add column if not exists payment_type text;
alter table public.rent_payments add column if not exists property_address text;
alter table public.rent_payments add column if not exists property_id uuid;
alter table public.rent_payments add column if not exists status text;
alter table public.rent_payments add column if not exists tenant_email text;
alter table public.rent_payments add column if not exists total_amount_due numeric;

alter table public.restaurants add column if not exists created_at timestamptz default now();
alter table public.restaurants add column if not exists updated_at timestamptz default now();
alter table public.restaurants add column if not exists created_date timestamptz default now();
alter table public.restaurants add column if not exists created_by text;
alter table public.restaurants add column if not exists owner_email text;

alter table public.revenue_shares add column if not exists created_at timestamptz default now();
alter table public.revenue_shares add column if not exists updated_at timestamptz default now();
alter table public.revenue_shares add column if not exists created_date timestamptz default now();
alter table public.revenue_shares add column if not exists content_id uuid;
alter table public.revenue_shares add column if not exists creator_email text;
alter table public.revenue_shares add column if not exists share_percent numeric;

alter table public.reviews add column if not exists created_at timestamptz default now();
alter table public.reviews add column if not exists updated_at timestamptz default now();
alter table public.reviews add column if not exists created_date timestamptz default now();
alter table public.reviews add column if not exists category_ratings jsonb;
alter table public.reviews add column if not exists content text;
alter table public.reviews add column if not exists helpful_by jsonb;
alter table public.reviews add column if not exists helpful_count integer;
alter table public.reviews add column if not exists photos jsonb;
alter table public.reviews add column if not exists provider_email text;
alter table public.reviews add column if not exists rating numeric;
alter table public.reviews add column if not exists reviewer_avatar text;
alter table public.reviews add column if not exists reviewer_email text;
alter table public.reviews add column if not exists reviewer_name text;
alter table public.reviews add column if not exists service_id uuid;
alter table public.reviews add column if not exists service_name text;
alter table public.reviews add column if not exists service_type text;
alter table public.reviews add column if not exists status text;
alter table public.reviews add column if not exists title text;
alter table public.reviews add column if not exists verified_purchase boolean;

alter table public.ride_requests add column if not exists created_at timestamptz default now();
alter table public.ride_requests add column if not exists updated_at timestamptz default now();
alter table public.ride_requests add column if not exists created_date timestamptz default now();
alter table public.ride_requests add column if not exists cancellation_details jsonb;
alter table public.ride_requests add column if not exists cancellation_reason text;
alter table public.ride_requests add column if not exists cancelled_by text;
alter table public.ride_requests add column if not exists conversation_id uuid;
alter table public.ride_requests add column if not exists created_by text;
alter table public.ride_requests add column if not exists destination text;
alter table public.ride_requests add column if not exists driver_email text;
alter table public.ride_requests add column if not exists driver_name text;
alter table public.ride_requests add column if not exists driver_profile_picture text;
alter table public.ride_requests add column if not exists driver_status text;
alter table public.ride_requests add column if not exists driver_vehicle_info jsonb;
alter table public.ride_requests add column if not exists dropoff_address text;
alter table public.ride_requests add column if not exists dropoff_coords jsonb;
alter table public.ride_requests add column if not exists end_time timestamptz;
alter table public.ride_requests add column if not exists estimated_distance_miles numeric;
alter table public.ride_requests add column if not exists estimated_duration_minutes integer;
alter table public.ride_requests add column if not exists fare_breakdown jsonb;
alter table public.ride_requests add column if not exists gift_code text;
alter table public.ride_requests add column if not exists gift_recipient_email text;
alter table public.ride_requests add column if not exists gift_recipient_name text;
alter table public.ride_requests add column if not exists gift_recipient_phone text;
alter table public.ride_requests add column if not exists is_for_someone_else boolean;
alter table public.ride_requests add column if not exists is_gift_ride boolean;
alter table public.ride_requests add column if not exists is_scheduled boolean;
alter table public.ride_requests add column if not exists is_shared boolean;
alter table public.ride_requests add column if not exists matched_at timestamptz;
alter table public.ride_requests add column if not exists max_passengers integer;
alter table public.ride_requests add column if not exists passenger_email text;
alter table public.ride_requests add column if not exists passenger_rating numeric;
alter table public.ride_requests add column if not exists passenger_review text;
alter table public.ride_requests add column if not exists passenger_verification_code text;
alter table public.ride_requests add column if not exists pickup_address text;
alter table public.ride_requests add column if not exists pickup_coords jsonb;
alter table public.ride_requests add column if not exists price numeric;
alter table public.ride_requests add column if not exists recipient_name text;
alter table public.ride_requests add column if not exists recipient_phone text;
alter table public.ride_requests add column if not exists ride_type text;
alter table public.ride_requests add column if not exists rider_preferences jsonb;
alter table public.ride_requests add column if not exists route_geometry jsonb;
alter table public.ride_requests add column if not exists safety_pin text;
alter table public.ride_requests add column if not exists safety_pin_confirmed boolean;
alter table public.ride_requests add column if not exists start_time timestamptz;
alter table public.ride_requests add column if not exists status text;
alter table public.ride_requests add column if not exists vehicle_class_details jsonb;

alter table public.royalty_earnings add column if not exists created_at timestamptz default now();
alter table public.royalty_earnings add column if not exists updated_at timestamptz default now();
alter table public.royalty_earnings add column if not exists created_date timestamptz default now();
alter table public.royalty_earnings add column if not exists user_email text;

alter table public.royalty_payouts add column if not exists created_at timestamptz default now();
alter table public.royalty_payouts add column if not exists updated_at timestamptz default now();
alter table public.royalty_payouts add column if not exists created_date timestamptz default now();
alter table public.royalty_payouts add column if not exists user_email text;

alter table public.royalty_splits add column if not exists created_at timestamptz default now();
alter table public.royalty_splits add column if not exists updated_at timestamptz default now();
alter table public.royalty_splits add column if not exists created_date timestamptz default now();
alter table public.royalty_splits add column if not exists track_id uuid;

alter table public.saved_groups add column if not exists created_at timestamptz default now();
alter table public.saved_groups add column if not exists updated_at timestamptz default now();
alter table public.saved_groups add column if not exists created_date timestamptz default now();
alter table public.saved_groups add column if not exists group_id uuid;
alter table public.saved_groups add column if not exists group_name text;
alter table public.saved_groups add column if not exists user_email text;

alter table public.saved_jobs add column if not exists created_at timestamptz default now();
alter table public.saved_jobs add column if not exists updated_at timestamptz default now();
alter table public.saved_jobs add column if not exists created_date timestamptz default now();
alter table public.saved_jobs add column if not exists application_url text;
alter table public.saved_jobs add column if not exists company_name text;
alter table public.saved_jobs add column if not exists job_category text;
alter table public.saved_jobs add column if not exists job_id uuid;
alter table public.saved_jobs add column if not exists job_location text;
alter table public.saved_jobs add column if not exists job_title text;
alter table public.saved_jobs add column if not exists job_type text;
alter table public.saved_jobs add column if not exists pay_rate numeric;
alter table public.saved_jobs add column if not exists pay_type text;
alter table public.saved_jobs add column if not exists poster_photo text;
alter table public.saved_jobs add column if not exists user_email text;

alter table public.saved_properties add column if not exists created_at timestamptz default now();
alter table public.saved_properties add column if not exists updated_at timestamptz default now();
alter table public.saved_properties add column if not exists created_date timestamptz default now();
alter table public.saved_properties add column if not exists collection_name text;
alter table public.saved_properties add column if not exists listing_type text;
alter table public.saved_properties add column if not exists property_id uuid;
alter table public.saved_properties add column if not exists property_image text;
alter table public.saved_properties add column if not exists property_location text;
alter table public.saved_properties add column if not exists property_price numeric;
alter table public.saved_properties add column if not exists property_title text;
alter table public.saved_properties add column if not exists property_type text;
alter table public.saved_properties add column if not exists user_email text;

alter table public.service_agreements add column if not exists created_at timestamptz default now();
alter table public.service_agreements add column if not exists updated_at timestamptz default now();
alter table public.service_agreements add column if not exists created_date timestamptz default now();
alter table public.service_agreements add column if not exists acceptance_method text;
alter table public.service_agreements add column if not exists agreement_text text;
alter table public.service_agreements add column if not exists contract_id uuid;
alter table public.service_agreements add column if not exists customer_email text;
alter table public.service_agreements add column if not exists customer_ip_address text;
alter table public.service_agreements add column if not exists customer_name text;
alter table public.service_agreements add column if not exists customer_signature text;
alter table public.service_agreements add column if not exists provider_email text;
alter table public.service_agreements add column if not exists service_id uuid;
alter table public.service_agreements add column if not exists signed_at timestamptz;
alter table public.service_agreements add column if not exists status text;

alter table public.service_availability_overrides add column if not exists created_at timestamptz default now();
alter table public.service_availability_overrides add column if not exists updated_at timestamptz default now();
alter table public.service_availability_overrides add column if not exists created_date timestamptz default now();
alter table public.service_availability_overrides add column if not exists end_time text;
alter table public.service_availability_overrides add column if not exists is_active boolean;
alter table public.service_availability_overrides add column if not exists is_available boolean;
alter table public.service_availability_overrides add column if not exists override_date timestamptz;
alter table public.service_availability_overrides add column if not exists provider_email text;
alter table public.service_availability_overrides add column if not exists reason text;
alter table public.service_availability_overrides add column if not exists service_id uuid;
alter table public.service_availability_overrides add column if not exists start_time text;

alter table public.service_bookings add column if not exists created_at timestamptz default now();
alter table public.service_bookings add column if not exists updated_at timestamptz default now();
alter table public.service_bookings add column if not exists created_date timestamptz default now();
alter table public.service_bookings add column if not exists booking_date timestamptz;
alter table public.service_bookings add column if not exists booking_time text;
alter table public.service_bookings add column if not exists confirmation_code text;
alter table public.service_bookings add column if not exists customer_email text;
alter table public.service_bookings add column if not exists customer_name text;
alter table public.service_bookings add column if not exists customer_notes text;
alter table public.service_bookings add column if not exists customer_phone text;
alter table public.service_bookings add column if not exists duration_hours numeric;
alter table public.service_bookings add column if not exists group_size integer;
alter table public.service_bookings add column if not exists location text;
alter table public.service_bookings add column if not exists metadata jsonb;
alter table public.service_bookings add column if not exists notes text;
alter table public.service_bookings add column if not exists payment_intent_id text;
alter table public.service_bookings add column if not exists payment_option text;
alter table public.service_bookings add column if not exists provider_email text;
alter table public.service_bookings add column if not exists provider_name text;
alter table public.service_bookings add column if not exists provider_notes text;
alter table public.service_bookings add column if not exists rating numeric;
alter table public.service_bookings add column if not exists review_submitted boolean;
alter table public.service_bookings add column if not exists service_id uuid;
alter table public.service_bookings add column if not exists service_title text;
alter table public.service_bookings add column if not exists status text;
alter table public.service_bookings add column if not exists total_price numeric;

alter table public.service_contracts add column if not exists created_at timestamptz default now();
alter table public.service_contracts add column if not exists updated_at timestamptz default now();
alter table public.service_contracts add column if not exists created_date timestamptz default now();
alter table public.service_contracts add column if not exists amount numeric;
alter table public.service_contracts add column if not exists body text;
alter table public.service_contracts add column if not exists creator_email text;
alter table public.service_contracts add column if not exists creator_name text;
alter table public.service_contracts add column if not exists creator_signature text;
alter table public.service_contracts add column if not exists creator_signed_at timestamptz;
alter table public.service_contracts add column if not exists delivery_method text;
alter table public.service_contracts add column if not exists end_date timestamptz;
alter table public.service_contracts add column if not exists is_active boolean;
alter table public.service_contracts add column if not exists liability_disclaimer_accepted boolean;
alter table public.service_contracts add column if not exists provider_email text;
alter table public.service_contracts add column if not exists recipient_email text;
alter table public.service_contracts add column if not exists recipient_name text;
alter table public.service_contracts add column if not exists recipient_signature text;
alter table public.service_contracts add column if not exists recipient_signed_at timestamptz;
alter table public.service_contracts add column if not exists service_description text;
alter table public.service_contracts add column if not exists start_date timestamptz;
alter table public.service_contracts add column if not exists status text;
alter table public.service_contracts add column if not exists title text;
alter table public.service_contracts add column if not exists viewed_at timestamptz;

alter table public.services add column if not exists created_at timestamptz default now();
alter table public.services add column if not exists updated_at timestamptz default now();
alter table public.services add column if not exists created_date timestamptz default now();

alter table public.shared_content_libraries add column if not exists created_at timestamptz default now();
alter table public.shared_content_libraries add column if not exists updated_at timestamptz default now();
alter table public.shared_content_libraries add column if not exists created_date timestamptz default now();
alter table public.shared_content_libraries add column if not exists content_ids jsonb;
alter table public.shared_content_libraries add column if not exists revenue_split jsonb;

alter table public.showcase_posts add column if not exists created_at timestamptz default now();
alter table public.showcase_posts add column if not exists updated_at timestamptz default now();
alter table public.showcase_posts add column if not exists created_date timestamptz default now();
alter table public.showcase_posts add column if not exists creator_email text;
alter table public.showcase_posts add column if not exists creator_name text;
alter table public.showcase_posts add column if not exists creator_photo text;
alter table public.showcase_posts add column if not exists price numeric;
alter table public.showcase_posts add column if not exists tags jsonb;

alter table public.social_posts add column if not exists created_at timestamptz default now();
alter table public.social_posts add column if not exists updated_at timestamptz default now();
alter table public.social_posts add column if not exists created_date timestamptz default now();
alter table public.social_posts add column if not exists author_email text;
alter table public.social_posts add column if not exists author_name text;
alter table public.social_posts add column if not exists caption text;
alter table public.social_posts add column if not exists comments_count integer;
alter table public.social_posts add column if not exists created_by text;
alter table public.social_posts add column if not exists creator_name text;
alter table public.social_posts add column if not exists creator_profile_picture text;
alter table public.social_posts add column if not exists creator_username text;
alter table public.social_posts add column if not exists experience_type text;
alter table public.social_posts add column if not exists image_url text;
alter table public.social_posts add column if not exists is_experience boolean;
alter table public.social_posts add column if not exists is_story boolean;
alter table public.social_posts add column if not exists liked_by jsonb;
alter table public.social_posts add column if not exists likes_count integer;
alter table public.social_posts add column if not exists location text;
alter table public.social_posts add column if not exists media_type text;
alter table public.social_posts add column if not exists music_playing text;
alter table public.social_posts add column if not exists vibe text;
alter table public.social_posts add column if not exists views_count integer;

alter table public.sponsored_contents add column if not exists created_at timestamptz default now();
alter table public.sponsored_contents add column if not exists updated_at timestamptz default now();
alter table public.sponsored_contents add column if not exists created_date timestamptz default now();
alter table public.sponsored_contents add column if not exists creator_email text;
alter table public.sponsored_contents add column if not exists status text;

alter table public.stakings add column if not exists created_at timestamptz default now();
alter table public.stakings add column if not exists updated_at timestamptz default now();
alter table public.stakings add column if not exists created_date timestamptz default now();
alter table public.stakings add column if not exists amount numeric;
alter table public.stakings add column if not exists apy numeric;
alter table public.stakings add column if not exists currency text;
alter table public.stakings add column if not exists earned_rewards text;
alter table public.stakings add column if not exists end_date timestamptz;
alter table public.stakings add column if not exists last_reward_calculation text;
alter table public.stakings add column if not exists lock_period_days integer;
alter table public.stakings add column if not exists start_date timestamptz;
alter table public.stakings add column if not exists status text;
alter table public.stakings add column if not exists user_email text;

alter table public.stock_alerts add column if not exists created_at timestamptz default now();
alter table public.stock_alerts add column if not exists updated_at timestamptz default now();
alter table public.stock_alerts add column if not exists created_date timestamptz default now();
alter table public.stock_alerts add column if not exists alert_type text;
alter table public.stock_alerts add column if not exists current_stock integer;
alter table public.stock_alerts add column if not exists is_resolved boolean;
alter table public.stock_alerts add column if not exists item_id uuid;
alter table public.stock_alerts add column if not exists item_name text;
alter table public.stock_alerts add column if not exists owner_email text;
alter table public.stock_alerts add column if not exists resolved_at timestamptz;
alter table public.stock_alerts add column if not exists threshold integer;

alter table public.store_settings add column if not exists created_at timestamptz default now();
alter table public.store_settings add column if not exists updated_at timestamptz default now();
alter table public.store_settings add column if not exists created_date timestamptz default now();
alter table public.store_settings add column if not exists owner_email text;
alter table public.store_settings add column if not exists store_name text;

alter table public.stories add column if not exists created_at timestamptz default now();
alter table public.stories add column if not exists updated_at timestamptz default now();
alter table public.stories add column if not exists created_date timestamptz default now();
alter table public.stories add column if not exists caption text;
alter table public.stories add column if not exists creator_name text;
alter table public.stories add column if not exists creator_profile_picture text;
alter table public.stories add column if not exists expires_at timestamptz;
alter table public.stories add column if not exists media_type text;
alter table public.stories add column if not exists media_url text;
alter table public.stories add column if not exists music text;
alter table public.stories add column if not exists views integer;
alter table public.stories add column if not exists visibility text;

alter table public.stream_goals add column if not exists created_at timestamptz default now();
alter table public.stream_goals add column if not exists updated_at timestamptz default now();
alter table public.stream_goals add column if not exists created_date timestamptz default now();
alter table public.stream_goals add column if not exists creator_email text;
alter table public.stream_goals add column if not exists goal_description text;
alter table public.stream_goals add column if not exists goal_title text;
alter table public.stream_goals add column if not exists goal_type text;
alter table public.stream_goals add column if not exists is_active boolean;
alter table public.stream_goals add column if not exists stream_id uuid;
alter table public.stream_goals add column if not exists target_amount numeric;

alter table public.streaming_contents add column if not exists created_at timestamptz default now();
alter table public.streaming_contents add column if not exists updated_at timestamptz default now();
alter table public.streaming_contents add column if not exists created_date timestamptz default now();
alter table public.streaming_contents add column if not exists agora_channel_name text;
alter table public.streaming_contents add column if not exists betting_available boolean;
alter table public.streaming_contents add column if not exists category text;
alter table public.streaming_contents add column if not exists chapters jsonb;
alter table public.streaming_contents add column if not exists clip_end_time numeric;
alter table public.streaming_contents add column if not exists clip_start_time numeric;
alter table public.streaming_contents add column if not exists content_type text;
alter table public.streaming_contents add column if not exists created_by text;
alter table public.streaming_contents add column if not exists creator_email text;
alter table public.streaming_contents add column if not exists creator_username text;
alter table public.streaming_contents add column if not exists description text;
alter table public.streaming_contents add column if not exists duration numeric;
alter table public.streaming_contents add column if not exists is_live boolean;
alter table public.streaming_contents add column if not exists is_monetized boolean;
alter table public.streaming_contents add column if not exists liked_by jsonb;
alter table public.streaming_contents add column if not exists likes_count integer;
alter table public.streaming_contents add column if not exists price_usd numeric;
alter table public.streaming_contents add column if not exists rating numeric;
alter table public.streaming_contents add column if not exists rental_price_usd numeric;
alter table public.streaming_contents add column if not exists requires_subscription boolean;
alter table public.streaming_contents add column if not exists source_stream_id uuid;
alter table public.streaming_contents add column if not exists source_type text;
alter table public.streaming_contents add column if not exists status text;
alter table public.streaming_contents add column if not exists stream_ended_at timestamptz;
alter table public.streaming_contents add column if not exists stream_started_at timestamptz;
alter table public.streaming_contents add column if not exists tags jsonb;
alter table public.streaming_contents add column if not exists thumbnail_url text;
alter table public.streaming_contents add column if not exists title text;
alter table public.streaming_contents add column if not exists type text;
alter table public.streaming_contents add column if not exists video_url text;
alter table public.streaming_contents add column if not exists views integer;
alter table public.streaming_contents add column if not exists visibility text;
alter table public.streaming_contents add column if not exists vod_trim_end numeric;

alter table public.stripe_payments add column if not exists created_at timestamptz default now();
alter table public.stripe_payments add column if not exists updated_at timestamptz default now();
alter table public.stripe_payments add column if not exists created_date timestamptz default now();
alter table public.stripe_payments add column if not exists amount numeric;
alter table public.stripe_payments add column if not exists currency text;
alter table public.stripe_payments add column if not exists description text;
alter table public.stripe_payments add column if not exists payment_method text;
alter table public.stripe_payments add column if not exists status text;
alter table public.stripe_payments add column if not exists user_email text;

alter table public.subscription_tiers add column if not exists created_at timestamptz default now();
alter table public.subscription_tiers add column if not exists updated_at timestamptz default now();
alter table public.subscription_tiers add column if not exists created_date timestamptz default now();
alter table public.subscription_tiers add column if not exists creator_email text;
alter table public.subscription_tiers add column if not exists creator_username text;
alter table public.subscription_tiers add column if not exists is_active boolean;

alter table public.subscriptions add column if not exists created_at timestamptz default now();
alter table public.subscriptions add column if not exists updated_at timestamptz default now();
alter table public.subscriptions add column if not exists created_date timestamptz default now();

alter table public.support_messages add column if not exists created_at timestamptz default now();
alter table public.support_messages add column if not exists updated_at timestamptz default now();
alter table public.support_messages add column if not exists created_date timestamptz default now();
alter table public.support_messages add column if not exists is_internal boolean;
alter table public.support_messages add column if not exists sender_email text;
alter table public.support_messages add column if not exists sender_type text;
alter table public.support_messages add column if not exists ticket_id uuid;

alter table public.support_tickets add column if not exists created_at timestamptz default now();
alter table public.support_tickets add column if not exists updated_at timestamptz default now();
alter table public.support_tickets add column if not exists created_date timestamptz default now();
alter table public.support_tickets add column if not exists assigned_agent_email text;
alter table public.support_tickets add column if not exists description text;
alter table public.support_tickets add column if not exists priority text;
alter table public.support_tickets add column if not exists status text;
alter table public.support_tickets add column if not exists subject text;
alter table public.support_tickets add column if not exists user_email text;

alter table public.sync_messages add column if not exists created_at timestamptz default now();
alter table public.sync_messages add column if not exists updated_at timestamptz default now();
alter table public.sync_messages add column if not exists created_date timestamptz default now();
alter table public.sync_messages add column if not exists message text;
alter table public.sync_messages add column if not exists message_type text;
alter table public.sync_messages add column if not exists sender_email text;
alter table public.sync_messages add column if not exists sender_name text;
alter table public.sync_messages add column if not exists sync_request_id uuid;

alter table public.sync_requests add column if not exists created_at timestamptz default now();
alter table public.sync_requests add column if not exists updated_at timestamptz default now();
alter table public.sync_requests add column if not exists created_date timestamptz default now();
alter table public.sync_requests add column if not exists admin_notes text;
alter table public.sync_requests add column if not exists artist_email text;
alter table public.sync_requests add column if not exists status text;

alter table public.tax_reports add column if not exists created_at timestamptz default now();
alter table public.tax_reports add column if not exists updated_at timestamptz default now();
alter table public.tax_reports add column if not exists created_date timestamptz default now();
alter table public.tax_reports add column if not exists transaction_details jsonb;
alter table public.tax_reports add column if not exists user_email text;

alter table public.ticket_affiliates add column if not exists created_at timestamptz default now();
alter table public.ticket_affiliates add column if not exists updated_at timestamptz default now();
alter table public.ticket_affiliates add column if not exists created_date timestamptz default now();
alter table public.ticket_affiliates add column if not exists conversion_status text;
alter table public.ticket_affiliates add column if not exists payout_date timestamptz;

alter table public.tip_transactions add column if not exists created_at timestamptz default now();
alter table public.tip_transactions add column if not exists updated_at timestamptz default now();
alter table public.tip_transactions add column if not exists created_date timestamptz default now();
alter table public.tip_transactions add column if not exists amount_rri numeric;
alter table public.tip_transactions add column if not exists amount_usd numeric;
alter table public.tip_transactions add column if not exists content_id uuid;
alter table public.tip_transactions add column if not exists creator_email text;
alter table public.tip_transactions add column if not exists creator_username text;
alter table public.tip_transactions add column if not exists from_email text;
alter table public.tip_transactions add column if not exists from_name text;
alter table public.tip_transactions add column if not exists is_livestream_tip boolean;
alter table public.tip_transactions add column if not exists message text;
alter table public.tip_transactions add column if not exists payment_intent_id text;
alter table public.tip_transactions add column if not exists recipient_email text;
alter table public.tip_transactions add column if not exists status text;
alter table public.tip_transactions add column if not exists tipper_email text;
alter table public.tip_transactions add column if not exists tipper_name text;
alter table public.tip_transactions add column if not exists tipper_username text;

alter table public.trader_ratings add column if not exists created_at timestamptz default now();
alter table public.trader_ratings add column if not exists updated_at timestamptz default now();
alter table public.trader_ratings add column if not exists created_date timestamptz default now();
alter table public.trader_ratings add column if not exists aspects jsonb;
alter table public.trader_ratings add column if not exists order_id uuid;
alter table public.trader_ratings add column if not exists rater_email text;
alter table public.trader_ratings add column if not exists rating numeric;
alter table public.trader_ratings add column if not exists review_text text;
alter table public.trader_ratings add column if not exists trade_type text;
alter table public.trader_ratings add column if not exists trader_email text;

alter table public.travel_alerts add column if not exists created_at timestamptz default now();
alter table public.travel_alerts add column if not exists updated_at timestamptz default now();
alter table public.travel_alerts add column if not exists created_date timestamptz default now();

alter table public.travel_bookings add column if not exists created_at timestamptz default now();
alter table public.travel_bookings add column if not exists updated_at timestamptz default now();
alter table public.travel_bookings add column if not exists created_date timestamptz default now();
alter table public.travel_bookings add column if not exists add_ons_total numeric;
alter table public.travel_bookings add column if not exists base_price numeric;
alter table public.travel_bookings add column if not exists booking_date timestamptz;
alter table public.travel_bookings add column if not exists booking_time text;
alter table public.travel_bookings add column if not exists category text;
alter table public.travel_bookings add column if not exists customer_email text;
alter table public.travel_bookings add column if not exists customer_name text;
alter table public.travel_bookings add column if not exists duration_hours numeric;
alter table public.travel_bookings add column if not exists guests integer;
alter table public.travel_bookings add column if not exists listing_id uuid;
alter table public.travel_bookings add column if not exists listing_title text;
alter table public.travel_bookings add column if not exists payment_status text;
alter table public.travel_bookings add column if not exists provider_email text;
alter table public.travel_bookings add column if not exists selected_add_ons jsonb;
alter table public.travel_bookings add column if not exists special_requests text;
alter table public.travel_bookings add column if not exists status text;
alter table public.travel_bookings add column if not exists stripe_session_id text;
alter table public.travel_bookings add column if not exists total_amount numeric;

alter table public.travel_listings add column if not exists created_at timestamptz default now();
alter table public.travel_listings add column if not exists updated_at timestamptz default now();
alter table public.travel_listings add column if not exists created_date timestamptz default now();
alter table public.travel_listings add column if not exists category text;
alter table public.travel_listings add column if not exists is_active boolean;
alter table public.travel_listings add column if not exists provider_email text;
alter table public.travel_listings add column if not exists provider_name text;

alter table public.two_factor_codes add column if not exists created_at timestamptz default now();
alter table public.two_factor_codes add column if not exists updated_at timestamptz default now();
alter table public.two_factor_codes add column if not exists created_date timestamptz default now();

alter table public.user_galleries add column if not exists created_at timestamptz default now();
alter table public.user_galleries add column if not exists updated_at timestamptz default now();
alter table public.user_galleries add column if not exists created_date timestamptz default now();
alter table public.user_galleries add column if not exists caption text;
alter table public.user_galleries add column if not exists is_pinned boolean;
alter table public.user_galleries add column if not exists liked_by jsonb;
alter table public.user_galleries add column if not exists likes_count integer;
alter table public.user_galleries add column if not exists media_type text;
alter table public.user_galleries add column if not exists media_url text;
alter table public.user_galleries add column if not exists user_email text;

alter table public.user_interactions add column if not exists created_at timestamptz default now();
alter table public.user_interactions add column if not exists updated_at timestamptz default now();
alter table public.user_interactions add column if not exists created_date timestamptz default now();
alter table public.user_interactions add column if not exists user_email text;

alter table public.user_interests add column if not exists created_at timestamptz default now();
alter table public.user_interests add column if not exists updated_at timestamptz default now();
alter table public.user_interests add column if not exists created_date timestamptz default now();
alter table public.user_interests add column if not exists user_email text;

alter table public.user_inventories add column if not exists created_at timestamptz default now();
alter table public.user_inventories add column if not exists updated_at timestamptz default now();
alter table public.user_inventories add column if not exists created_date timestamptz default now();
alter table public.user_inventories add column if not exists game_name text;
alter table public.user_inventories add column if not exists is_equipped boolean;
alter table public.user_inventories add column if not exists item_id uuid;
alter table public.user_inventories add column if not exists item_name text;
alter table public.user_inventories add column if not exists item_type text;
alter table public.user_inventories add column if not exists purchase_date timestamptz;
alter table public.user_inventories add column if not exists user_email text;
alter table public.user_inventories add column if not exists uses_remaining integer;

alter table public.user_job_preferences add column if not exists created_at timestamptz default now();
alter table public.user_job_preferences add column if not exists updated_at timestamptz default now();
alter table public.user_job_preferences add column if not exists created_date timestamptz default now();

alter table public.user_presences add column if not exists created_at timestamptz default now();
alter table public.user_presences add column if not exists updated_at timestamptz default now();
alter table public.user_presences add column if not exists created_date timestamptz default now();
alter table public.user_presences add column if not exists last_seen text;
alter table public.user_presences add column if not exists status text;
alter table public.user_presences add column if not exists typing_started text;
alter table public.user_presences add column if not exists typing_to text;
alter table public.user_presences add column if not exists user_email text;
alter table public.user_presences add column if not exists user_name text;
alter table public.user_presences add column if not exists user_photo text;

alter table public.user_reviews add column if not exists created_at timestamptz default now();
alter table public.user_reviews add column if not exists updated_at timestamptz default now();
alter table public.user_reviews add column if not exists created_date timestamptz default now();
alter table public.user_reviews add column if not exists booking_id uuid;
alter table public.user_reviews add column if not exists categories jsonb;
alter table public.user_reviews add column if not exists helpful_count integer;
alter table public.user_reviews add column if not exists host_response text;
alter table public.user_reviews add column if not exists host_response_date timestamptz;
alter table public.user_reviews add column if not exists property_id uuid;
alter table public.user_reviews add column if not exists property_title text;
alter table public.user_reviews add column if not exists provider_email text;
alter table public.user_reviews add column if not exists rating numeric;
alter table public.user_reviews add column if not exists review_text text;
alter table public.user_reviews add column if not exists review_type text;
alter table public.user_reviews add column if not exists reviewed_email text;
alter table public.user_reviews add column if not exists reviewed_user_email text;
alter table public.user_reviews add column if not exists reviewer_email text;
alter table public.user_reviews add column if not exists reviewer_name text;
alter table public.user_reviews add column if not exists reviewer_photo text;
alter table public.user_reviews add column if not exists verified_transaction boolean;

alter table public.user_subscriptions add column if not exists created_at timestamptz default now();
alter table public.user_subscriptions add column if not exists updated_at timestamptz default now();
alter table public.user_subscriptions add column if not exists created_date timestamptz default now();
alter table public.user_subscriptions add column if not exists billing_period text;
alter table public.user_subscriptions add column if not exists creator_email text;
alter table public.user_subscriptions add column if not exists monthly_amount_usd numeric;
alter table public.user_subscriptions add column if not exists next_billing_date timestamptz;
alter table public.user_subscriptions add column if not exists price_per_period numeric;
alter table public.user_subscriptions add column if not exists start_date timestamptz;
alter table public.user_subscriptions add column if not exists status text;
alter table public.user_subscriptions add column if not exists subscriber_email text;
alter table public.user_subscriptions add column if not exists subscription_tier_id uuid;
alter table public.user_subscriptions add column if not exists tier_name text;
alter table public.user_subscriptions add column if not exists user_email text;

alter table public.user_vehicles add column if not exists created_at timestamptz default now();
alter table public.user_vehicles add column if not exists updated_at timestamptz default now();
alter table public.user_vehicles add column if not exists created_date timestamptz default now();
alter table public.user_vehicles add column if not exists acceleration numeric;
alter table public.user_vehicles add column if not exists color text;
alter table public.user_vehicles add column if not exists handling numeric;
alter table public.user_vehicles add column if not exists is_equipped boolean;
alter table public.user_vehicles add column if not exists is_unlocked boolean;
alter table public.user_vehicles add column if not exists price numeric;
alter table public.user_vehicles add column if not exists top_speed numeric;
alter table public.user_vehicles add column if not exists total_distance numeric;
alter table public.user_vehicles add column if not exists user_email text;
alter table public.user_vehicles add column if not exists vehicle_name text;
alter table public.user_vehicles add column if not exists vehicle_type text;

alter table public.utility_accounts add column if not exists created_at timestamptz default now();
alter table public.utility_accounts add column if not exists updated_at timestamptz default now();
alter table public.utility_accounts add column if not exists created_date timestamptz default now();

alter table public.video_comments add column if not exists created_at timestamptz default now();
alter table public.video_comments add column if not exists updated_at timestamptz default now();
alter table public.video_comments add column if not exists created_date timestamptz default now();
alter table public.video_comments add column if not exists comment_text text;
alter table public.video_comments add column if not exists user_email text;
alter table public.video_comments add column if not exists user_name text;
alter table public.video_comments add column if not exists video_id uuid;

alter table public.video_likes add column if not exists created_at timestamptz default now();
alter table public.video_likes add column if not exists updated_at timestamptz default now();
alter table public.video_likes add column if not exists created_date timestamptz default now();

alter table public.video_posts add column if not exists created_at timestamptz default now();
alter table public.video_posts add column if not exists updated_at timestamptz default now();
alter table public.video_posts add column if not exists created_date timestamptz default now();
alter table public.video_posts add column if not exists caption text;
alter table public.video_posts add column if not exists challenge_id uuid;
alter table public.video_posts add column if not exists comments_count integer;
alter table public.video_posts add column if not exists created_by text;
alter table public.video_posts add column if not exists creator_email text;
alter table public.video_posts add column if not exists creator_name text;
alter table public.video_posts add column if not exists engagement_score numeric;
alter table public.video_posts add column if not exists filters_applied boolean;
alter table public.video_posts add column if not exists hashtags jsonb;
alter table public.video_posts add column if not exists is_duet boolean;
alter table public.video_posts add column if not exists is_stitch boolean;
alter table public.video_posts add column if not exists original_video_id uuid;
alter table public.video_posts add column if not exists sounds_used jsonb;
alter table public.video_posts add column if not exists video_url text;

alter table public.video_templates add column if not exists created_at timestamptz default now();
alter table public.video_templates add column if not exists updated_at timestamptz default now();
alter table public.video_templates add column if not exists created_date timestamptz default now();
alter table public.video_templates add column if not exists created_by text;
alter table public.video_templates add column if not exists uses_count integer;

alter table public.viewer_analytics add column if not exists created_at timestamptz default now();
alter table public.viewer_analytics add column if not exists updated_at timestamptz default now();
alter table public.viewer_analytics add column if not exists created_date timestamptz default now();
alter table public.viewer_analytics add column if not exists content_id uuid;
alter table public.viewer_analytics add column if not exists created_by text;
alter table public.viewer_analytics add column if not exists is_currently_watching boolean;
alter table public.viewer_analytics add column if not exists viewer_email text;

alter table public.watch_parties add column if not exists created_at timestamptz default now();
alter table public.watch_parties add column if not exists updated_at timestamptz default now();
alter table public.watch_parties add column if not exists created_date timestamptz default now();
alter table public.watch_parties add column if not exists content_id uuid;
alter table public.watch_parties add column if not exists current_playback_time numeric;
alter table public.watch_parties add column if not exists host_email text;
alter table public.watch_parties add column if not exists host_name text;
alter table public.watch_parties add column if not exists is_active boolean;
alter table public.watch_parties add column if not exists is_playing boolean;
alter table public.watch_parties add column if not exists is_public boolean;
alter table public.watch_parties add column if not exists max_participants integer;
alter table public.watch_parties add column if not exists participants jsonb;
alter table public.watch_parties add column if not exists party_name text;

alter table public.watch_party_messages add column if not exists created_at timestamptz default now();
alter table public.watch_party_messages add column if not exists updated_at timestamptz default now();
alter table public.watch_party_messages add column if not exists created_date timestamptz default now();
alter table public.watch_party_messages add column if not exists message text;
alter table public.watch_party_messages add column if not exists party_id uuid;
alter table public.watch_party_messages add column if not exists sender_email text;
alter table public.watch_party_messages add column if not exists sender_name text;

alter table public.watch_party_playlists add column if not exists created_at timestamptz default now();
alter table public.watch_party_playlists add column if not exists updated_at timestamptz default now();
alter table public.watch_party_playlists add column if not exists created_date timestamptz default now();
alter table public.watch_party_playlists add column if not exists content_items jsonb;
alter table public.watch_party_playlists add column if not exists current_index integer;
alter table public.watch_party_playlists add column if not exists party_id uuid;

-- =============================================================================
-- Table-level grants
-- RLS policies only restrict which ROWS a statement can see/touch; without a
-- baseline table-level GRANT, `authenticated` cannot run the statement at all.
-- A stock Supabase project sets this up once for all FUTURE tables via
-- ALTER DEFAULT PRIVILEGES, but that default can be missing or have been
-- changed, so these are issued explicitly per table too. GRANT is idempotent
-- (safe to re-run; it never errors on an already-held privilege).
-- =============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.ad_campaigns to authenticated;
grant select, insert, update, delete on public.affiliate_listings to authenticated;
grant select, insert, update, delete on public.affiliate_referrals to authenticated;
grant select, insert, update, delete on public.affiliate_reviews to authenticated;
grant select, insert, update, delete on public.ai_recommendations to authenticated;
grant select, insert, update, delete on public.ai_tools to authenticated;
grant select, insert, update, delete on public.amazon_orders to authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert, update, delete on public.bank_accounts to authenticated;
grant select, insert, update, delete on public.bill_payments to authenticated;
grant select, insert, update, delete on public.blocks to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.campaign_backers to authenticated;
grant select, insert, update, delete on public.car_rentals to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert, update, delete on public.carts to authenticated;
grant select, insert, update, delete on public.challenges to authenticated;
grant select, insert, update, delete on public.chat_conversations to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.co_stream_participants to authenticated;
grant select, insert, update, delete on public.collaborations to authenticated;
grant select, insert, update, delete on public.collaborative_documents to authenticated;
grant select, insert, update, delete on public.collaborative_videos to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, update, delete on public.content_analytics to authenticated;
grant select, insert, update, delete on public.content_edits to authenticated;
grant select, insert, update, delete on public.content_purchases to authenticated;
grant select, insert, update, delete on public.creator_memberships to authenticated;
grant select, insert, update, delete on public.creator_metrics to authenticated;
grant select, insert, update, delete on public.creator_products to authenticated;
grant select, insert, update, delete on public.creator_subscriptions to authenticated;
grant select, insert, update, delete on public.crowdfunding_campaigns to authenticated;
grant select, insert, update, delete on public.crypto_rewards to authenticated;
grant select, insert, update, delete on public.crypto_transactions to authenticated;
grant select, insert, update, delete on public.crypto_wallets to authenticated;
grant select, insert, update, delete on public.damage_settlements to authenticated;
grant select, insert, update, delete on public.defi_positions to authenticated;
grant select, insert, update, delete on public.delivery_franchises to authenticated;
grant select, insert, update, delete on public.delivery_orders to authenticated;
grant select, insert, update, delete on public.delivery_vehicles to authenticated;
grant select, insert, update, delete on public.digital_products to authenticated;
grant select, insert, update, delete on public.direct_messages to authenticated;
grant select, insert, update, delete on public.disputes to authenticated;
grant select, insert, update, delete on public.document_comments to authenticated;
grant select, insert, update, delete on public.document_presences to authenticated;
grant select, insert, update, delete on public.donations to authenticated;
grant select, insert, update, delete on public.driver_ratings to authenticated;
grant select, insert, update, delete on public.driver_stats to authenticated;
grant select, insert, update, delete on public.entertainment_tickets to authenticated;
grant select, insert, update, delete on public.error_logs to authenticated;
grant select, insert, update, delete on public.escrow_transactions to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.experiences to authenticated;
grant select, insert, update, delete on public.failed_payments to authenticated;
grant select, insert, update, delete on public.fan_pools to authenticated;
grant select, insert, update, delete on public.follow_requests to authenticated;
grant select, insert, update, delete on public.follows to authenticated;
grant select, insert, update, delete on public.food_orders to authenticated;
grant select, insert, update, delete on public.forum_groups to authenticated;
grant select, insert, update, delete on public.forum_likes to authenticated;
grant select, insert, update, delete on public.forum_posts to authenticated;
grant select, insert, update, delete on public.forum_replies to authenticated;
grant select, insert, update, delete on public.forum_threads to authenticated;
grant select, insert, update, delete on public.friend_requests to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.game_items to authenticated;
grant select, insert, update, delete on public.game_premium_subscriptions to authenticated;
grant select, insert, update, delete on public.game_scores to authenticated;
grant select, insert, update, delete on public.game_sessions to authenticated;
grant select, insert, update, delete on public.help_guides to authenticated;
grant select, insert, update, delete on public.inventory_products to authenticated;
grant select, insert, update, delete on public.job_applications to authenticated;
grant select, insert, update, delete on public.job_gigs to authenticated;
grant select, insert, update, delete on public.lease_applications to authenticated;
grant select, insert, update, delete on public.lease_documents to authenticated;
grant select, insert, update, delete on public.leases to authenticated;
grant select, insert, update, delete on public.listening_histories to authenticated;
grant select, insert, update, delete on public.livestream_chat_messages to authenticated;
grant select, insert, update, delete on public.livestream_chats to authenticated;
grant select, insert, update, delete on public.livestream_polls to authenticated;
grant select, insert, update, delete on public.livestream_pricing_tiers to authenticated;
grant select, insert, update, delete on public.livestream_reactions to authenticated;
grant select, insert, update, delete on public.livestream_schedules to authenticated;
grant select, insert, update, delete on public.livestream_tickets to authenticated;
grant select, insert, update, delete on public.maintenance_requests to authenticated;
grant select, insert, update, delete on public.marketplace_items to authenticated;
grant select, insert, update, delete on public.membership_subscriptions to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update, delete on public.moderation_flags to authenticated;
grant select, insert, update, delete on public.music_albums to authenticated;
grant select, insert, update, delete on public.music_contracts to authenticated;
grant select, insert, update, delete on public.music_deal_applications to authenticated;
grant select, insert, update, delete on public.music_distributions to authenticated;
grant select, insert, update, delete on public.music_masterings to authenticated;
grant select, insert, update, delete on public.music_tracks to authenticated;
grant select, insert, update, delete on public.news_posts to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.onboarding_progress to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.p2p_escrows to authenticated;
grant select, insert, update, delete on public.p2p_orders to authenticated;
grant select, insert, update, delete on public.p2p_transactions to authenticated;
grant select, insert, update, delete on public.password_entries to authenticated;
grant select, insert, update, delete on public.payment_cards to authenticated;
grant select, insert, update, delete on public.payment_methods to authenticated;
grant select, insert, update, delete on public.payment_requests to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.payout_methods to authenticated;
grant select, insert, update, delete on public.payout_requests to authenticated;
grant select, insert, update, delete on public.physical_card_requests to authenticated;
grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.poll_votes to authenticated;
grant select, insert, update, delete on public.portfolio_items to authenticated;
grant select, insert, update, delete on public.ppv_contents to authenticated;
grant select, insert, update, delete on public.ppv_purchases to authenticated;
grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.property_bookings to authenticated;
grant select, insert, update, delete on public.provider_availabilities to authenticated;
grant select, insert, update, delete on public.provider_onboardings to authenticated;
grant select, insert, update, delete on public.provider_verifications to authenticated;
grant select, insert, update, delete on public.qa_questions to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, update, delete on public.reels to authenticated;
grant select, insert, update, delete on public.rent_payments to authenticated;
grant select, insert, update, delete on public.restaurants to authenticated;
grant select, insert, update, delete on public.revenue_shares to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.ride_requests to authenticated;
grant select, insert, update, delete on public.royalty_earnings to authenticated;
grant select, insert, update, delete on public.royalty_payouts to authenticated;
grant select, insert, update, delete on public.royalty_splits to authenticated;
grant select, insert, update, delete on public.saved_groups to authenticated;
grant select, insert, update, delete on public.saved_jobs to authenticated;
grant select, insert, update, delete on public.saved_properties to authenticated;
grant select, insert, update, delete on public.service_agreements to authenticated;
grant select, insert, update, delete on public.service_availability_overrides to authenticated;
grant select, insert, update, delete on public.service_bookings to authenticated;
grant select, insert, update, delete on public.service_contracts to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.shared_content_libraries to authenticated;
grant select, insert, update, delete on public.showcase_posts to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select, insert, update, delete on public.sponsored_contents to authenticated;
grant select, insert, update, delete on public.stakings to authenticated;
grant select, insert, update, delete on public.stock_alerts to authenticated;
grant select, insert, update, delete on public.store_settings to authenticated;
grant select, insert, update, delete on public.stories to authenticated;
grant select, insert, update, delete on public.stream_goals to authenticated;
grant select, insert, update, delete on public.streaming_contents to authenticated;
grant select, insert, update, delete on public.stripe_payments to authenticated;
grant select, insert, update, delete on public.subscription_tiers to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.support_messages to authenticated;
grant select, insert, update, delete on public.support_tickets to authenticated;
grant select, insert, update, delete on public.sync_messages to authenticated;
grant select, insert, update, delete on public.sync_requests to authenticated;
grant select, insert, update, delete on public.tax_reports to authenticated;
grant select, insert, update, delete on public.ticket_affiliates to authenticated;
grant select, insert, update, delete on public.tip_transactions to authenticated;
grant select, insert, update, delete on public.trader_ratings to authenticated;
grant select, insert, update, delete on public.travel_alerts to authenticated;
grant select, insert, update, delete on public.travel_bookings to authenticated;
grant select, insert, update, delete on public.travel_listings to authenticated;
grant select, insert, update, delete on public.two_factor_codes to authenticated;
grant select, insert, update, delete on public.user_galleries to authenticated;
grant select, insert, update, delete on public.user_interactions to authenticated;
grant select, insert, update, delete on public.user_interests to authenticated;
grant select, insert, update, delete on public.user_inventories to authenticated;
grant select, insert, update, delete on public.user_job_preferences to authenticated;
grant select, insert, update, delete on public.user_presences to authenticated;
grant select, insert, update, delete on public.user_reviews to authenticated;
grant select, insert, update, delete on public.user_subscriptions to authenticated;
grant select, insert, update, delete on public.user_vehicles to authenticated;
grant select, insert, update, delete on public.utility_accounts to authenticated;
grant select, insert, update, delete on public.video_comments to authenticated;
grant select, insert, update, delete on public.video_likes to authenticated;
grant select, insert, update, delete on public.video_posts to authenticated;
grant select, insert, update, delete on public.video_templates to authenticated;
grant select, insert, update, delete on public.viewer_analytics to authenticated;
grant select, insert, update, delete on public.watch_parties to authenticated;
grant select, insert, update, delete on public.watch_party_messages to authenticated;
grant select, insert, update, delete on public.watch_party_playlists to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.ad_campaigns enable row level security;
drop policy if exists "ad_campaigns_select_authenticated" on public.ad_campaigns;
create policy "ad_campaigns_select_authenticated" on public.ad_campaigns for select to authenticated using (true);
drop policy if exists "ad_campaigns_insert_own" on public.ad_campaigns;
create policy "ad_campaigns_insert_own" on public.ad_campaigns for insert to authenticated with check (auth.email() = advertiser_email);
drop policy if exists "ad_campaigns_update_own" on public.ad_campaigns;
create policy "ad_campaigns_update_own" on public.ad_campaigns for update to authenticated using (auth.email() = advertiser_email) with check (auth.email() = advertiser_email);
drop policy if exists "ad_campaigns_delete_own" on public.ad_campaigns;
create policy "ad_campaigns_delete_own" on public.ad_campaigns for delete to authenticated using (auth.email() = advertiser_email);

alter table public.affiliate_listings enable row level security;
drop policy if exists "affiliate_listings_select_authenticated" on public.affiliate_listings;
create policy "affiliate_listings_select_authenticated" on public.affiliate_listings for select to authenticated using (true);
drop policy if exists "affiliate_listings_insert_own" on public.affiliate_listings;
create policy "affiliate_listings_insert_own" on public.affiliate_listings for insert to authenticated with check (auth.email() = poster_email);
drop policy if exists "affiliate_listings_update_own" on public.affiliate_listings;
create policy "affiliate_listings_update_own" on public.affiliate_listings for update to authenticated using (auth.email() = poster_email) with check (auth.email() = poster_email);
drop policy if exists "affiliate_listings_delete_own" on public.affiliate_listings;
create policy "affiliate_listings_delete_own" on public.affiliate_listings for delete to authenticated using (auth.email() = poster_email);

alter table public.affiliate_referrals enable row level security;
drop policy if exists "affiliate_referrals_select_authenticated" on public.affiliate_referrals;
create policy "affiliate_referrals_select_authenticated" on public.affiliate_referrals for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "affiliate_referrals_write_authenticated" on public.affiliate_referrals;
create policy "affiliate_referrals_write_authenticated" on public.affiliate_referrals for all to authenticated using (true) with check (true);

alter table public.affiliate_reviews enable row level security;
drop policy if exists "affiliate_reviews_select_authenticated" on public.affiliate_reviews;
create policy "affiliate_reviews_select_authenticated" on public.affiliate_reviews for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "affiliate_reviews_write_authenticated" on public.affiliate_reviews;
create policy "affiliate_reviews_write_authenticated" on public.affiliate_reviews for all to authenticated using (true) with check (true);

alter table public.ai_recommendations enable row level security;
drop policy if exists "ai_recommendations_select_authenticated" on public.ai_recommendations;
create policy "ai_recommendations_select_authenticated" on public.ai_recommendations for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "ai_recommendations_write_authenticated" on public.ai_recommendations;
create policy "ai_recommendations_write_authenticated" on public.ai_recommendations for all to authenticated using (true) with check (true);

alter table public.ai_tools enable row level security;
drop policy if exists "ai_tools_select_authenticated" on public.ai_tools;
create policy "ai_tools_select_authenticated" on public.ai_tools for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "ai_tools_write_authenticated" on public.ai_tools;
create policy "ai_tools_write_authenticated" on public.ai_tools for all to authenticated using (true) with check (true);

alter table public.amazon_orders enable row level security;
drop policy if exists "amazon_orders_select_authenticated" on public.amazon_orders;
create policy "amazon_orders_select_authenticated" on public.amazon_orders for select to authenticated using (true);
drop policy if exists "amazon_orders_insert_own" on public.amazon_orders;
create policy "amazon_orders_insert_own" on public.amazon_orders for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "amazon_orders_update_own" on public.amazon_orders;
create policy "amazon_orders_update_own" on public.amazon_orders for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "amazon_orders_delete_own" on public.amazon_orders;
create policy "amazon_orders_delete_own" on public.amazon_orders for delete to authenticated using (auth.email() = user_email);

alter table public.assets enable row level security;
drop policy if exists "assets_select_authenticated" on public.assets;
create policy "assets_select_authenticated" on public.assets for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "assets_write_authenticated" on public.assets;
create policy "assets_write_authenticated" on public.assets for all to authenticated using (true) with check (true);

alter table public.bank_accounts enable row level security;
drop policy if exists "bank_accounts_select_authenticated" on public.bank_accounts;
create policy "bank_accounts_select_authenticated" on public.bank_accounts for select to authenticated using (true);
drop policy if exists "bank_accounts_insert_own" on public.bank_accounts;
create policy "bank_accounts_insert_own" on public.bank_accounts for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "bank_accounts_update_own" on public.bank_accounts;
create policy "bank_accounts_update_own" on public.bank_accounts for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "bank_accounts_delete_own" on public.bank_accounts;
create policy "bank_accounts_delete_own" on public.bank_accounts for delete to authenticated using (auth.email() = user_email);

alter table public.bill_payments enable row level security;
drop policy if exists "bill_payments_select_authenticated" on public.bill_payments;
create policy "bill_payments_select_authenticated" on public.bill_payments for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "bill_payments_write_authenticated" on public.bill_payments;
create policy "bill_payments_write_authenticated" on public.bill_payments for all to authenticated using (true) with check (true);

alter table public.blocks enable row level security;
drop policy if exists "blocks_select_authenticated" on public.blocks;
create policy "blocks_select_authenticated" on public.blocks for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "blocks_write_authenticated" on public.blocks;
create policy "blocks_write_authenticated" on public.blocks for all to authenticated using (true) with check (true);

alter table public.bookings enable row level security;
drop policy if exists "bookings_select_authenticated" on public.bookings;
create policy "bookings_select_authenticated" on public.bookings for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "bookings_write_authenticated" on public.bookings;
create policy "bookings_write_authenticated" on public.bookings for all to authenticated using (true) with check (true);

alter table public.campaign_backers enable row level security;
drop policy if exists "campaign_backers_select_authenticated" on public.campaign_backers;
create policy "campaign_backers_select_authenticated" on public.campaign_backers for select to authenticated using (true);
drop policy if exists "campaign_backers_insert_own" on public.campaign_backers;
create policy "campaign_backers_insert_own" on public.campaign_backers for insert to authenticated with check (auth.email() = backer_email);
drop policy if exists "campaign_backers_update_own" on public.campaign_backers;
create policy "campaign_backers_update_own" on public.campaign_backers for update to authenticated using (auth.email() = backer_email) with check (auth.email() = backer_email);
drop policy if exists "campaign_backers_delete_own" on public.campaign_backers;
create policy "campaign_backers_delete_own" on public.campaign_backers for delete to authenticated using (auth.email() = backer_email);

alter table public.car_rentals enable row level security;
drop policy if exists "car_rentals_select_authenticated" on public.car_rentals;
create policy "car_rentals_select_authenticated" on public.car_rentals for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "car_rentals_write_authenticated" on public.car_rentals;
create policy "car_rentals_write_authenticated" on public.car_rentals for all to authenticated using (true) with check (true);

alter table public.cart_items enable row level security;
drop policy if exists "cart_items_select_authenticated" on public.cart_items;
create policy "cart_items_select_authenticated" on public.cart_items for select to authenticated using (true);
drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own" on public.cart_items for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own" on public.cart_items for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own" on public.cart_items for delete to authenticated using (auth.email() = user_email);

alter table public.carts enable row level security;
drop policy if exists "carts_select_authenticated" on public.carts;
create policy "carts_select_authenticated" on public.carts for select to authenticated using (true);
drop policy if exists "carts_insert_own" on public.carts;
create policy "carts_insert_own" on public.carts for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "carts_update_own" on public.carts;
create policy "carts_update_own" on public.carts for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "carts_delete_own" on public.carts;
create policy "carts_delete_own" on public.carts for delete to authenticated using (auth.email() = user_email);

alter table public.challenges enable row level security;
drop policy if exists "challenges_select_authenticated" on public.challenges;
create policy "challenges_select_authenticated" on public.challenges for select to authenticated using (true);
drop policy if exists "challenges_insert_own" on public.challenges;
create policy "challenges_insert_own" on public.challenges for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "challenges_update_own" on public.challenges;
create policy "challenges_update_own" on public.challenges for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "challenges_delete_own" on public.challenges;
create policy "challenges_delete_own" on public.challenges for delete to authenticated using (auth.email() = creator_email);

alter table public.chat_conversations enable row level security;
drop policy if exists "chat_conversations_select_authenticated" on public.chat_conversations;
create policy "chat_conversations_select_authenticated" on public.chat_conversations for select to authenticated using (true);
drop policy if exists "chat_conversations_insert_own" on public.chat_conversations;
create policy "chat_conversations_insert_own" on public.chat_conversations for insert to authenticated with check (auth.email() = created_by);
drop policy if exists "chat_conversations_update_own" on public.chat_conversations;
create policy "chat_conversations_update_own" on public.chat_conversations for update to authenticated using (auth.email() = created_by) with check (auth.email() = created_by);
drop policy if exists "chat_conversations_delete_own" on public.chat_conversations;
create policy "chat_conversations_delete_own" on public.chat_conversations for delete to authenticated using (auth.email() = created_by);

alter table public.chat_messages enable row level security;
drop policy if exists "chat_messages_select_authenticated" on public.chat_messages;
create policy "chat_messages_select_authenticated" on public.chat_messages for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "chat_messages_write_authenticated" on public.chat_messages;
create policy "chat_messages_write_authenticated" on public.chat_messages for all to authenticated using (true) with check (true);

alter table public.co_stream_participants enable row level security;
drop policy if exists "co_stream_participants_select_authenticated" on public.co_stream_participants;
create policy "co_stream_participants_select_authenticated" on public.co_stream_participants for select to authenticated using (true);
drop policy if exists "co_stream_participants_insert_own" on public.co_stream_participants;
create policy "co_stream_participants_insert_own" on public.co_stream_participants for insert to authenticated with check (auth.email() = participant_email);
drop policy if exists "co_stream_participants_update_own" on public.co_stream_participants;
create policy "co_stream_participants_update_own" on public.co_stream_participants for update to authenticated using (auth.email() = participant_email) with check (auth.email() = participant_email);
drop policy if exists "co_stream_participants_delete_own" on public.co_stream_participants;
create policy "co_stream_participants_delete_own" on public.co_stream_participants for delete to authenticated using (auth.email() = participant_email);

alter table public.collaborations enable row level security;
drop policy if exists "collaborations_select_authenticated" on public.collaborations;
create policy "collaborations_select_authenticated" on public.collaborations for select to authenticated using (true);
drop policy if exists "collaborations_insert_own" on public.collaborations;
create policy "collaborations_insert_own" on public.collaborations for insert to authenticated with check (auth.email() = initiator_email);
drop policy if exists "collaborations_update_own" on public.collaborations;
create policy "collaborations_update_own" on public.collaborations for update to authenticated using (auth.email() = initiator_email) with check (auth.email() = initiator_email);
drop policy if exists "collaborations_delete_own" on public.collaborations;
create policy "collaborations_delete_own" on public.collaborations for delete to authenticated using (auth.email() = initiator_email);

alter table public.collaborative_documents enable row level security;
drop policy if exists "collaborative_documents_select_authenticated" on public.collaborative_documents;
create policy "collaborative_documents_select_authenticated" on public.collaborative_documents for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "collaborative_documents_write_authenticated" on public.collaborative_documents;
create policy "collaborative_documents_write_authenticated" on public.collaborative_documents for all to authenticated using (true) with check (true);

alter table public.collaborative_videos enable row level security;
drop policy if exists "collaborative_videos_select_authenticated" on public.collaborative_videos;
create policy "collaborative_videos_select_authenticated" on public.collaborative_videos for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "collaborative_videos_write_authenticated" on public.collaborative_videos;
create policy "collaborative_videos_write_authenticated" on public.collaborative_videos for all to authenticated using (true) with check (true);

alter table public.comments enable row level security;
drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated" on public.comments for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "comments_write_authenticated" on public.comments;
create policy "comments_write_authenticated" on public.comments for all to authenticated using (true) with check (true);

alter table public.content_analytics enable row level security;
drop policy if exists "content_analytics_select_authenticated" on public.content_analytics;
create policy "content_analytics_select_authenticated" on public.content_analytics for select to authenticated using (true);
drop policy if exists "content_analytics_insert_own" on public.content_analytics;
create policy "content_analytics_insert_own" on public.content_analytics for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "content_analytics_update_own" on public.content_analytics;
create policy "content_analytics_update_own" on public.content_analytics for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "content_analytics_delete_own" on public.content_analytics;
create policy "content_analytics_delete_own" on public.content_analytics for delete to authenticated using (auth.email() = creator_email);

alter table public.content_edits enable row level security;
drop policy if exists "content_edits_select_authenticated" on public.content_edits;
create policy "content_edits_select_authenticated" on public.content_edits for select to authenticated using (true);
drop policy if exists "content_edits_insert_own" on public.content_edits;
create policy "content_edits_insert_own" on public.content_edits for insert to authenticated with check (auth.email() = editor_email);
drop policy if exists "content_edits_update_own" on public.content_edits;
create policy "content_edits_update_own" on public.content_edits for update to authenticated using (auth.email() = editor_email) with check (auth.email() = editor_email);
drop policy if exists "content_edits_delete_own" on public.content_edits;
create policy "content_edits_delete_own" on public.content_edits for delete to authenticated using (auth.email() = editor_email);

alter table public.content_purchases enable row level security;
drop policy if exists "content_purchases_select_authenticated" on public.content_purchases;
create policy "content_purchases_select_authenticated" on public.content_purchases for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "content_purchases_write_authenticated" on public.content_purchases;
create policy "content_purchases_write_authenticated" on public.content_purchases for all to authenticated using (true) with check (true);

alter table public.creator_memberships enable row level security;
drop policy if exists "creator_memberships_select_authenticated" on public.creator_memberships;
create policy "creator_memberships_select_authenticated" on public.creator_memberships for select to authenticated using (true);
drop policy if exists "creator_memberships_insert_own" on public.creator_memberships;
create policy "creator_memberships_insert_own" on public.creator_memberships for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "creator_memberships_update_own" on public.creator_memberships;
create policy "creator_memberships_update_own" on public.creator_memberships for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "creator_memberships_delete_own" on public.creator_memberships;
create policy "creator_memberships_delete_own" on public.creator_memberships for delete to authenticated using (auth.email() = creator_email);

alter table public.creator_metrics enable row level security;
drop policy if exists "creator_metrics_select_authenticated" on public.creator_metrics;
create policy "creator_metrics_select_authenticated" on public.creator_metrics for select to authenticated using (true);
drop policy if exists "creator_metrics_insert_own" on public.creator_metrics;
create policy "creator_metrics_insert_own" on public.creator_metrics for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "creator_metrics_update_own" on public.creator_metrics;
create policy "creator_metrics_update_own" on public.creator_metrics for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "creator_metrics_delete_own" on public.creator_metrics;
create policy "creator_metrics_delete_own" on public.creator_metrics for delete to authenticated using (auth.email() = creator_email);

alter table public.creator_products enable row level security;
drop policy if exists "creator_products_select_authenticated" on public.creator_products;
create policy "creator_products_select_authenticated" on public.creator_products for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "creator_products_write_authenticated" on public.creator_products;
create policy "creator_products_write_authenticated" on public.creator_products for all to authenticated using (true) with check (true);

alter table public.creator_subscriptions enable row level security;
drop policy if exists "creator_subscriptions_select_authenticated" on public.creator_subscriptions;
create policy "creator_subscriptions_select_authenticated" on public.creator_subscriptions for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "creator_subscriptions_write_authenticated" on public.creator_subscriptions;
create policy "creator_subscriptions_write_authenticated" on public.creator_subscriptions for all to authenticated using (true) with check (true);

alter table public.crowdfunding_campaigns enable row level security;
drop policy if exists "crowdfunding_campaigns_select_authenticated" on public.crowdfunding_campaigns;
create policy "crowdfunding_campaigns_select_authenticated" on public.crowdfunding_campaigns for select to authenticated using (true);
drop policy if exists "crowdfunding_campaigns_insert_own" on public.crowdfunding_campaigns;
create policy "crowdfunding_campaigns_insert_own" on public.crowdfunding_campaigns for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "crowdfunding_campaigns_update_own" on public.crowdfunding_campaigns;
create policy "crowdfunding_campaigns_update_own" on public.crowdfunding_campaigns for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "crowdfunding_campaigns_delete_own" on public.crowdfunding_campaigns;
create policy "crowdfunding_campaigns_delete_own" on public.crowdfunding_campaigns for delete to authenticated using (auth.email() = creator_email);

alter table public.crypto_rewards enable row level security;
drop policy if exists "crypto_rewards_select_authenticated" on public.crypto_rewards;
create policy "crypto_rewards_select_authenticated" on public.crypto_rewards for select to authenticated using (true);
drop policy if exists "crypto_rewards_insert_own" on public.crypto_rewards;
create policy "crypto_rewards_insert_own" on public.crypto_rewards for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "crypto_rewards_update_own" on public.crypto_rewards;
create policy "crypto_rewards_update_own" on public.crypto_rewards for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "crypto_rewards_delete_own" on public.crypto_rewards;
create policy "crypto_rewards_delete_own" on public.crypto_rewards for delete to authenticated using (auth.email() = user_email);

alter table public.crypto_transactions enable row level security;
drop policy if exists "crypto_transactions_select_authenticated" on public.crypto_transactions;
create policy "crypto_transactions_select_authenticated" on public.crypto_transactions for select to authenticated using (true);
drop policy if exists "crypto_transactions_insert_own" on public.crypto_transactions;
create policy "crypto_transactions_insert_own" on public.crypto_transactions for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "crypto_transactions_update_own" on public.crypto_transactions;
create policy "crypto_transactions_update_own" on public.crypto_transactions for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "crypto_transactions_delete_own" on public.crypto_transactions;
create policy "crypto_transactions_delete_own" on public.crypto_transactions for delete to authenticated using (auth.email() = user_email);

alter table public.crypto_wallets enable row level security;
drop policy if exists "crypto_wallets_select_authenticated" on public.crypto_wallets;
create policy "crypto_wallets_select_authenticated" on public.crypto_wallets for select to authenticated using (true);
drop policy if exists "crypto_wallets_insert_own" on public.crypto_wallets;
create policy "crypto_wallets_insert_own" on public.crypto_wallets for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "crypto_wallets_update_own" on public.crypto_wallets;
create policy "crypto_wallets_update_own" on public.crypto_wallets for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "crypto_wallets_delete_own" on public.crypto_wallets;
create policy "crypto_wallets_delete_own" on public.crypto_wallets for delete to authenticated using (auth.email() = user_email);

alter table public.damage_settlements enable row level security;
drop policy if exists "damage_settlements_select_authenticated" on public.damage_settlements;
create policy "damage_settlements_select_authenticated" on public.damage_settlements for select to authenticated using (true);
drop policy if exists "damage_settlements_insert_own" on public.damage_settlements;
create policy "damage_settlements_insert_own" on public.damage_settlements for insert to authenticated with check (auth.email() = owner_email);
drop policy if exists "damage_settlements_update_own" on public.damage_settlements;
create policy "damage_settlements_update_own" on public.damage_settlements for update to authenticated using (auth.email() = owner_email) with check (auth.email() = owner_email);
drop policy if exists "damage_settlements_delete_own" on public.damage_settlements;
create policy "damage_settlements_delete_own" on public.damage_settlements for delete to authenticated using (auth.email() = owner_email);

alter table public.defi_positions enable row level security;
drop policy if exists "defi_positions_select_authenticated" on public.defi_positions;
create policy "defi_positions_select_authenticated" on public.defi_positions for select to authenticated using (true);
drop policy if exists "defi_positions_insert_own" on public.defi_positions;
create policy "defi_positions_insert_own" on public.defi_positions for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "defi_positions_update_own" on public.defi_positions;
create policy "defi_positions_update_own" on public.defi_positions for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "defi_positions_delete_own" on public.defi_positions;
create policy "defi_positions_delete_own" on public.defi_positions for delete to authenticated using (auth.email() = user_email);

alter table public.delivery_franchises enable row level security;
drop policy if exists "delivery_franchises_select_authenticated" on public.delivery_franchises;
create policy "delivery_franchises_select_authenticated" on public.delivery_franchises for select to authenticated using (true);
drop policy if exists "delivery_franchises_insert_own" on public.delivery_franchises;
create policy "delivery_franchises_insert_own" on public.delivery_franchises for insert to authenticated with check (auth.email() = owner_email);
drop policy if exists "delivery_franchises_update_own" on public.delivery_franchises;
create policy "delivery_franchises_update_own" on public.delivery_franchises for update to authenticated using (auth.email() = owner_email) with check (auth.email() = owner_email);
drop policy if exists "delivery_franchises_delete_own" on public.delivery_franchises;
create policy "delivery_franchises_delete_own" on public.delivery_franchises for delete to authenticated using (auth.email() = owner_email);

alter table public.delivery_orders enable row level security;
drop policy if exists "delivery_orders_select_authenticated" on public.delivery_orders;
create policy "delivery_orders_select_authenticated" on public.delivery_orders for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "delivery_orders_write_authenticated" on public.delivery_orders;
create policy "delivery_orders_write_authenticated" on public.delivery_orders for all to authenticated using (true) with check (true);

alter table public.delivery_vehicles enable row level security;
drop policy if exists "delivery_vehicles_select_authenticated" on public.delivery_vehicles;
create policy "delivery_vehicles_select_authenticated" on public.delivery_vehicles for select to authenticated using (true);
drop policy if exists "delivery_vehicles_insert_own" on public.delivery_vehicles;
create policy "delivery_vehicles_insert_own" on public.delivery_vehicles for insert to authenticated with check (auth.email() = driver_email);
drop policy if exists "delivery_vehicles_update_own" on public.delivery_vehicles;
create policy "delivery_vehicles_update_own" on public.delivery_vehicles for update to authenticated using (auth.email() = driver_email) with check (auth.email() = driver_email);
drop policy if exists "delivery_vehicles_delete_own" on public.delivery_vehicles;
create policy "delivery_vehicles_delete_own" on public.delivery_vehicles for delete to authenticated using (auth.email() = driver_email);

alter table public.digital_products enable row level security;
drop policy if exists "digital_products_select_authenticated" on public.digital_products;
create policy "digital_products_select_authenticated" on public.digital_products for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "digital_products_write_authenticated" on public.digital_products;
create policy "digital_products_write_authenticated" on public.digital_products for all to authenticated using (true) with check (true);

alter table public.direct_messages enable row level security;
drop policy if exists "direct_messages_select_authenticated" on public.direct_messages;
create policy "direct_messages_select_authenticated" on public.direct_messages for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "direct_messages_write_authenticated" on public.direct_messages;
create policy "direct_messages_write_authenticated" on public.direct_messages for all to authenticated using (true) with check (true);

alter table public.disputes enable row level security;
drop policy if exists "disputes_select_authenticated" on public.disputes;
create policy "disputes_select_authenticated" on public.disputes for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "disputes_write_authenticated" on public.disputes;
create policy "disputes_write_authenticated" on public.disputes for all to authenticated using (true) with check (true);

alter table public.document_comments enable row level security;
drop policy if exists "document_comments_select_authenticated" on public.document_comments;
create policy "document_comments_select_authenticated" on public.document_comments for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "document_comments_write_authenticated" on public.document_comments;
create policy "document_comments_write_authenticated" on public.document_comments for all to authenticated using (true) with check (true);

alter table public.document_presences enable row level security;
drop policy if exists "document_presences_select_authenticated" on public.document_presences;
create policy "document_presences_select_authenticated" on public.document_presences for select to authenticated using (true);
drop policy if exists "document_presences_insert_own" on public.document_presences;
create policy "document_presences_insert_own" on public.document_presences for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "document_presences_update_own" on public.document_presences;
create policy "document_presences_update_own" on public.document_presences for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "document_presences_delete_own" on public.document_presences;
create policy "document_presences_delete_own" on public.document_presences for delete to authenticated using (auth.email() = user_email);

alter table public.donations enable row level security;
drop policy if exists "donations_select_authenticated" on public.donations;
create policy "donations_select_authenticated" on public.donations for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "donations_write_authenticated" on public.donations;
create policy "donations_write_authenticated" on public.donations for all to authenticated using (true) with check (true);

alter table public.driver_ratings enable row level security;
drop policy if exists "driver_ratings_select_authenticated" on public.driver_ratings;
create policy "driver_ratings_select_authenticated" on public.driver_ratings for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "driver_ratings_write_authenticated" on public.driver_ratings;
create policy "driver_ratings_write_authenticated" on public.driver_ratings for all to authenticated using (true) with check (true);

alter table public.driver_stats enable row level security;
drop policy if exists "driver_stats_select_authenticated" on public.driver_stats;
create policy "driver_stats_select_authenticated" on public.driver_stats for select to authenticated using (true);
drop policy if exists "driver_stats_insert_own" on public.driver_stats;
create policy "driver_stats_insert_own" on public.driver_stats for insert to authenticated with check (auth.email() = driver_email);
drop policy if exists "driver_stats_update_own" on public.driver_stats;
create policy "driver_stats_update_own" on public.driver_stats for update to authenticated using (auth.email() = driver_email) with check (auth.email() = driver_email);
drop policy if exists "driver_stats_delete_own" on public.driver_stats;
create policy "driver_stats_delete_own" on public.driver_stats for delete to authenticated using (auth.email() = driver_email);

alter table public.entertainment_tickets enable row level security;
drop policy if exists "entertainment_tickets_select_authenticated" on public.entertainment_tickets;
create policy "entertainment_tickets_select_authenticated" on public.entertainment_tickets for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "entertainment_tickets_write_authenticated" on public.entertainment_tickets;
create policy "entertainment_tickets_write_authenticated" on public.entertainment_tickets for all to authenticated using (true) with check (true);

alter table public.error_logs enable row level security;
drop policy if exists "error_logs_select_authenticated" on public.error_logs;
create policy "error_logs_select_authenticated" on public.error_logs for select to authenticated using (true);
drop policy if exists "error_logs_insert_own" on public.error_logs;
create policy "error_logs_insert_own" on public.error_logs for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "error_logs_update_own" on public.error_logs;
create policy "error_logs_update_own" on public.error_logs for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "error_logs_delete_own" on public.error_logs;
create policy "error_logs_delete_own" on public.error_logs for delete to authenticated using (auth.email() = user_email);

alter table public.escrow_transactions enable row level security;
drop policy if exists "escrow_transactions_select_authenticated" on public.escrow_transactions;
create policy "escrow_transactions_select_authenticated" on public.escrow_transactions for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "escrow_transactions_write_authenticated" on public.escrow_transactions;
create policy "escrow_transactions_write_authenticated" on public.escrow_transactions for all to authenticated using (true) with check (true);

alter table public.events enable row level security;
drop policy if exists "events_select_authenticated" on public.events;
create policy "events_select_authenticated" on public.events for select to authenticated using (true);
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events for insert to authenticated with check (auth.email() = organizer_email);
drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events for update to authenticated using (auth.email() = organizer_email) with check (auth.email() = organizer_email);
drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events for delete to authenticated using (auth.email() = organizer_email);

alter table public.experiences enable row level security;
drop policy if exists "experiences_select_authenticated" on public.experiences;
create policy "experiences_select_authenticated" on public.experiences for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "experiences_write_authenticated" on public.experiences;
create policy "experiences_write_authenticated" on public.experiences for all to authenticated using (true) with check (true);

alter table public.failed_payments enable row level security;
drop policy if exists "failed_payments_select_authenticated" on public.failed_payments;
create policy "failed_payments_select_authenticated" on public.failed_payments for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "failed_payments_write_authenticated" on public.failed_payments;
create policy "failed_payments_write_authenticated" on public.failed_payments for all to authenticated using (true) with check (true);

alter table public.fan_pools enable row level security;
drop policy if exists "fan_pools_select_authenticated" on public.fan_pools;
create policy "fan_pools_select_authenticated" on public.fan_pools for select to authenticated using (true);
drop policy if exists "fan_pools_insert_own" on public.fan_pools;
create policy "fan_pools_insert_own" on public.fan_pools for insert to authenticated with check (auth.email() = artist_email);
drop policy if exists "fan_pools_update_own" on public.fan_pools;
create policy "fan_pools_update_own" on public.fan_pools for update to authenticated using (auth.email() = artist_email) with check (auth.email() = artist_email);
drop policy if exists "fan_pools_delete_own" on public.fan_pools;
create policy "fan_pools_delete_own" on public.fan_pools for delete to authenticated using (auth.email() = artist_email);

alter table public.follow_requests enable row level security;
drop policy if exists "follow_requests_select_authenticated" on public.follow_requests;
create policy "follow_requests_select_authenticated" on public.follow_requests for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "follow_requests_write_authenticated" on public.follow_requests;
create policy "follow_requests_write_authenticated" on public.follow_requests for all to authenticated using (true) with check (true);

alter table public.follows enable row level security;
drop policy if exists "follows_select_authenticated" on public.follows;
create policy "follows_select_authenticated" on public.follows for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "follows_write_authenticated" on public.follows;
create policy "follows_write_authenticated" on public.follows for all to authenticated using (true) with check (true);

alter table public.food_orders enable row level security;
drop policy if exists "food_orders_select_authenticated" on public.food_orders;
create policy "food_orders_select_authenticated" on public.food_orders for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "food_orders_write_authenticated" on public.food_orders;
create policy "food_orders_write_authenticated" on public.food_orders for all to authenticated using (true) with check (true);

alter table public.forum_groups enable row level security;
drop policy if exists "forum_groups_select_authenticated" on public.forum_groups;
create policy "forum_groups_select_authenticated" on public.forum_groups for select to authenticated using (true);
drop policy if exists "forum_groups_insert_own" on public.forum_groups;
create policy "forum_groups_insert_own" on public.forum_groups for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "forum_groups_update_own" on public.forum_groups;
create policy "forum_groups_update_own" on public.forum_groups for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "forum_groups_delete_own" on public.forum_groups;
create policy "forum_groups_delete_own" on public.forum_groups for delete to authenticated using (auth.email() = creator_email);

alter table public.forum_likes enable row level security;
drop policy if exists "forum_likes_select_authenticated" on public.forum_likes;
create policy "forum_likes_select_authenticated" on public.forum_likes for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "forum_likes_write_authenticated" on public.forum_likes;
create policy "forum_likes_write_authenticated" on public.forum_likes for all to authenticated using (true) with check (true);

alter table public.forum_posts enable row level security;
drop policy if exists "forum_posts_select_authenticated" on public.forum_posts;
create policy "forum_posts_select_authenticated" on public.forum_posts for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "forum_posts_write_authenticated" on public.forum_posts;
create policy "forum_posts_write_authenticated" on public.forum_posts for all to authenticated using (true) with check (true);

alter table public.forum_replies enable row level security;
drop policy if exists "forum_replies_select_authenticated" on public.forum_replies;
create policy "forum_replies_select_authenticated" on public.forum_replies for select to authenticated using (true);
drop policy if exists "forum_replies_insert_own" on public.forum_replies;
create policy "forum_replies_insert_own" on public.forum_replies for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "forum_replies_update_own" on public.forum_replies;
create policy "forum_replies_update_own" on public.forum_replies for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "forum_replies_delete_own" on public.forum_replies;
create policy "forum_replies_delete_own" on public.forum_replies for delete to authenticated using (auth.email() = user_email);

alter table public.forum_threads enable row level security;
drop policy if exists "forum_threads_select_authenticated" on public.forum_threads;
create policy "forum_threads_select_authenticated" on public.forum_threads for select to authenticated using (true);
drop policy if exists "forum_threads_insert_own" on public.forum_threads;
create policy "forum_threads_insert_own" on public.forum_threads for insert to authenticated with check (auth.email() = author_email);
drop policy if exists "forum_threads_update_own" on public.forum_threads;
create policy "forum_threads_update_own" on public.forum_threads for update to authenticated using (auth.email() = author_email) with check (auth.email() = author_email);
drop policy if exists "forum_threads_delete_own" on public.forum_threads;
create policy "forum_threads_delete_own" on public.forum_threads for delete to authenticated using (auth.email() = author_email);

alter table public.friend_requests enable row level security;
drop policy if exists "friend_requests_select_authenticated" on public.friend_requests;
create policy "friend_requests_select_authenticated" on public.friend_requests for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "friend_requests_write_authenticated" on public.friend_requests;
create policy "friend_requests_write_authenticated" on public.friend_requests for all to authenticated using (true) with check (true);

alter table public.friendships enable row level security;
drop policy if exists "friendships_select_authenticated" on public.friendships;
create policy "friendships_select_authenticated" on public.friendships for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "friendships_write_authenticated" on public.friendships;
create policy "friendships_write_authenticated" on public.friendships for all to authenticated using (true) with check (true);

alter table public.game_items enable row level security;
drop policy if exists "game_items_select_authenticated" on public.game_items;
create policy "game_items_select_authenticated" on public.game_items for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "game_items_write_authenticated" on public.game_items;
create policy "game_items_write_authenticated" on public.game_items for all to authenticated using (true) with check (true);

alter table public.game_premium_subscriptions enable row level security;
drop policy if exists "game_premium_subscriptions_select_authenticated" on public.game_premium_subscriptions;
create policy "game_premium_subscriptions_select_authenticated" on public.game_premium_subscriptions for select to authenticated using (true);
drop policy if exists "game_premium_subscriptions_insert_own" on public.game_premium_subscriptions;
create policy "game_premium_subscriptions_insert_own" on public.game_premium_subscriptions for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "game_premium_subscriptions_update_own" on public.game_premium_subscriptions;
create policy "game_premium_subscriptions_update_own" on public.game_premium_subscriptions for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "game_premium_subscriptions_delete_own" on public.game_premium_subscriptions;
create policy "game_premium_subscriptions_delete_own" on public.game_premium_subscriptions for delete to authenticated using (auth.email() = user_email);

alter table public.game_scores enable row level security;
drop policy if exists "game_scores_select_authenticated" on public.game_scores;
create policy "game_scores_select_authenticated" on public.game_scores for select to authenticated using (true);
drop policy if exists "game_scores_insert_own" on public.game_scores;
create policy "game_scores_insert_own" on public.game_scores for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "game_scores_update_own" on public.game_scores;
create policy "game_scores_update_own" on public.game_scores for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "game_scores_delete_own" on public.game_scores;
create policy "game_scores_delete_own" on public.game_scores for delete to authenticated using (auth.email() = user_email);

alter table public.game_sessions enable row level security;
drop policy if exists "game_sessions_select_authenticated" on public.game_sessions;
create policy "game_sessions_select_authenticated" on public.game_sessions for select to authenticated using (true);
drop policy if exists "game_sessions_insert_own" on public.game_sessions;
create policy "game_sessions_insert_own" on public.game_sessions for insert to authenticated with check (auth.email() = host_email);
drop policy if exists "game_sessions_update_own" on public.game_sessions;
create policy "game_sessions_update_own" on public.game_sessions for update to authenticated using (auth.email() = host_email) with check (auth.email() = host_email);
drop policy if exists "game_sessions_delete_own" on public.game_sessions;
create policy "game_sessions_delete_own" on public.game_sessions for delete to authenticated using (auth.email() = host_email);

alter table public.help_guides enable row level security;
drop policy if exists "help_guides_select_authenticated" on public.help_guides;
create policy "help_guides_select_authenticated" on public.help_guides for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "help_guides_write_authenticated" on public.help_guides;
create policy "help_guides_write_authenticated" on public.help_guides for all to authenticated using (true) with check (true);

alter table public.inventory_products enable row level security;
drop policy if exists "inventory_products_select_authenticated" on public.inventory_products;
create policy "inventory_products_select_authenticated" on public.inventory_products for select to authenticated using (true);
drop policy if exists "inventory_products_insert_own" on public.inventory_products;
create policy "inventory_products_insert_own" on public.inventory_products for insert to authenticated with check (auth.email() = owner_email);
drop policy if exists "inventory_products_update_own" on public.inventory_products;
create policy "inventory_products_update_own" on public.inventory_products for update to authenticated using (auth.email() = owner_email) with check (auth.email() = owner_email);
drop policy if exists "inventory_products_delete_own" on public.inventory_products;
create policy "inventory_products_delete_own" on public.inventory_products for delete to authenticated using (auth.email() = owner_email);

alter table public.job_applications enable row level security;
drop policy if exists "job_applications_select_authenticated" on public.job_applications;
create policy "job_applications_select_authenticated" on public.job_applications for select to authenticated using (true);
drop policy if exists "job_applications_insert_own" on public.job_applications;
create policy "job_applications_insert_own" on public.job_applications for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "job_applications_update_own" on public.job_applications;
create policy "job_applications_update_own" on public.job_applications for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "job_applications_delete_own" on public.job_applications;
create policy "job_applications_delete_own" on public.job_applications for delete to authenticated using (auth.email() = user_email);

alter table public.job_gigs enable row level security;
drop policy if exists "job_gigs_select_authenticated" on public.job_gigs;
create policy "job_gigs_select_authenticated" on public.job_gigs for select to authenticated using (true);
drop policy if exists "job_gigs_insert_own" on public.job_gigs;
create policy "job_gigs_insert_own" on public.job_gigs for insert to authenticated with check (auth.email() = poster_email);
drop policy if exists "job_gigs_update_own" on public.job_gigs;
create policy "job_gigs_update_own" on public.job_gigs for update to authenticated using (auth.email() = poster_email) with check (auth.email() = poster_email);
drop policy if exists "job_gigs_delete_own" on public.job_gigs;
create policy "job_gigs_delete_own" on public.job_gigs for delete to authenticated using (auth.email() = poster_email);

alter table public.lease_applications enable row level security;
drop policy if exists "lease_applications_select_authenticated" on public.lease_applications;
create policy "lease_applications_select_authenticated" on public.lease_applications for select to authenticated using (true);
drop policy if exists "lease_applications_insert_own" on public.lease_applications;
create policy "lease_applications_insert_own" on public.lease_applications for insert to authenticated with check (auth.email() = applicant_email);
drop policy if exists "lease_applications_update_own" on public.lease_applications;
create policy "lease_applications_update_own" on public.lease_applications for update to authenticated using (auth.email() = applicant_email) with check (auth.email() = applicant_email);
drop policy if exists "lease_applications_delete_own" on public.lease_applications;
create policy "lease_applications_delete_own" on public.lease_applications for delete to authenticated using (auth.email() = applicant_email);

alter table public.lease_documents enable row level security;
drop policy if exists "lease_documents_select_authenticated" on public.lease_documents;
create policy "lease_documents_select_authenticated" on public.lease_documents for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "lease_documents_write_authenticated" on public.lease_documents;
create policy "lease_documents_write_authenticated" on public.lease_documents for all to authenticated using (true) with check (true);

alter table public.leases enable row level security;
drop policy if exists "leases_select_authenticated" on public.leases;
create policy "leases_select_authenticated" on public.leases for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "leases_write_authenticated" on public.leases;
create policy "leases_write_authenticated" on public.leases for all to authenticated using (true) with check (true);

alter table public.listening_histories enable row level security;
drop policy if exists "listening_histories_select_authenticated" on public.listening_histories;
create policy "listening_histories_select_authenticated" on public.listening_histories for select to authenticated using (true);
drop policy if exists "listening_histories_insert_own" on public.listening_histories;
create policy "listening_histories_insert_own" on public.listening_histories for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "listening_histories_update_own" on public.listening_histories;
create policy "listening_histories_update_own" on public.listening_histories for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "listening_histories_delete_own" on public.listening_histories;
create policy "listening_histories_delete_own" on public.listening_histories for delete to authenticated using (auth.email() = user_email);

alter table public.livestream_chat_messages enable row level security;
drop policy if exists "livestream_chat_messages_select_authenticated" on public.livestream_chat_messages;
create policy "livestream_chat_messages_select_authenticated" on public.livestream_chat_messages for select to authenticated using (true);
drop policy if exists "livestream_chat_messages_insert_own" on public.livestream_chat_messages;
create policy "livestream_chat_messages_insert_own" on public.livestream_chat_messages for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "livestream_chat_messages_update_own" on public.livestream_chat_messages;
create policy "livestream_chat_messages_update_own" on public.livestream_chat_messages for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "livestream_chat_messages_delete_own" on public.livestream_chat_messages;
create policy "livestream_chat_messages_delete_own" on public.livestream_chat_messages for delete to authenticated using (auth.email() = user_email);

alter table public.livestream_chats enable row level security;
drop policy if exists "livestream_chats_select_authenticated" on public.livestream_chats;
create policy "livestream_chats_select_authenticated" on public.livestream_chats for select to authenticated using (true);
drop policy if exists "livestream_chats_insert_own" on public.livestream_chats;
create policy "livestream_chats_insert_own" on public.livestream_chats for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "livestream_chats_update_own" on public.livestream_chats;
create policy "livestream_chats_update_own" on public.livestream_chats for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "livestream_chats_delete_own" on public.livestream_chats;
create policy "livestream_chats_delete_own" on public.livestream_chats for delete to authenticated using (auth.email() = user_email);

alter table public.livestream_polls enable row level security;
drop policy if exists "livestream_polls_select_authenticated" on public.livestream_polls;
create policy "livestream_polls_select_authenticated" on public.livestream_polls for select to authenticated using (true);
drop policy if exists "livestream_polls_insert_own" on public.livestream_polls;
create policy "livestream_polls_insert_own" on public.livestream_polls for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "livestream_polls_update_own" on public.livestream_polls;
create policy "livestream_polls_update_own" on public.livestream_polls for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "livestream_polls_delete_own" on public.livestream_polls;
create policy "livestream_polls_delete_own" on public.livestream_polls for delete to authenticated using (auth.email() = creator_email);

alter table public.livestream_pricing_tiers enable row level security;
drop policy if exists "livestream_pricing_tiers_select_authenticated" on public.livestream_pricing_tiers;
create policy "livestream_pricing_tiers_select_authenticated" on public.livestream_pricing_tiers for select to authenticated using (true);
drop policy if exists "livestream_pricing_tiers_insert_own" on public.livestream_pricing_tiers;
create policy "livestream_pricing_tiers_insert_own" on public.livestream_pricing_tiers for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "livestream_pricing_tiers_update_own" on public.livestream_pricing_tiers;
create policy "livestream_pricing_tiers_update_own" on public.livestream_pricing_tiers for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "livestream_pricing_tiers_delete_own" on public.livestream_pricing_tiers;
create policy "livestream_pricing_tiers_delete_own" on public.livestream_pricing_tiers for delete to authenticated using (auth.email() = creator_email);

alter table public.livestream_reactions enable row level security;
drop policy if exists "livestream_reactions_select_authenticated" on public.livestream_reactions;
create policy "livestream_reactions_select_authenticated" on public.livestream_reactions for select to authenticated using (true);
drop policy if exists "livestream_reactions_insert_own" on public.livestream_reactions;
create policy "livestream_reactions_insert_own" on public.livestream_reactions for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "livestream_reactions_update_own" on public.livestream_reactions;
create policy "livestream_reactions_update_own" on public.livestream_reactions for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "livestream_reactions_delete_own" on public.livestream_reactions;
create policy "livestream_reactions_delete_own" on public.livestream_reactions for delete to authenticated using (auth.email() = user_email);

alter table public.livestream_schedules enable row level security;
drop policy if exists "livestream_schedules_select_authenticated" on public.livestream_schedules;
create policy "livestream_schedules_select_authenticated" on public.livestream_schedules for select to authenticated using (true);
drop policy if exists "livestream_schedules_insert_own" on public.livestream_schedules;
create policy "livestream_schedules_insert_own" on public.livestream_schedules for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "livestream_schedules_update_own" on public.livestream_schedules;
create policy "livestream_schedules_update_own" on public.livestream_schedules for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "livestream_schedules_delete_own" on public.livestream_schedules;
create policy "livestream_schedules_delete_own" on public.livestream_schedules for delete to authenticated using (auth.email() = creator_email);

alter table public.livestream_tickets enable row level security;
drop policy if exists "livestream_tickets_select_authenticated" on public.livestream_tickets;
create policy "livestream_tickets_select_authenticated" on public.livestream_tickets for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "livestream_tickets_write_authenticated" on public.livestream_tickets;
create policy "livestream_tickets_write_authenticated" on public.livestream_tickets for all to authenticated using (true) with check (true);

alter table public.maintenance_requests enable row level security;
drop policy if exists "maintenance_requests_select_authenticated" on public.maintenance_requests;
create policy "maintenance_requests_select_authenticated" on public.maintenance_requests for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "maintenance_requests_write_authenticated" on public.maintenance_requests;
create policy "maintenance_requests_write_authenticated" on public.maintenance_requests for all to authenticated using (true) with check (true);

alter table public.marketplace_items enable row level security;
drop policy if exists "marketplace_items_select_authenticated" on public.marketplace_items;
create policy "marketplace_items_select_authenticated" on public.marketplace_items for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "marketplace_items_write_authenticated" on public.marketplace_items;
create policy "marketplace_items_write_authenticated" on public.marketplace_items for all to authenticated using (true) with check (true);

alter table public.membership_subscriptions enable row level security;
drop policy if exists "membership_subscriptions_select_authenticated" on public.membership_subscriptions;
create policy "membership_subscriptions_select_authenticated" on public.membership_subscriptions for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "membership_subscriptions_write_authenticated" on public.membership_subscriptions;
create policy "membership_subscriptions_write_authenticated" on public.membership_subscriptions for all to authenticated using (true) with check (true);

alter table public.menu_items enable row level security;
drop policy if exists "menu_items_select_authenticated" on public.menu_items;
create policy "menu_items_select_authenticated" on public.menu_items for select to authenticated using (true);
drop policy if exists "menu_items_insert_own" on public.menu_items;
create policy "menu_items_insert_own" on public.menu_items for insert to authenticated with check (auth.email() = owner_email);
drop policy if exists "menu_items_update_own" on public.menu_items;
create policy "menu_items_update_own" on public.menu_items for update to authenticated using (auth.email() = owner_email) with check (auth.email() = owner_email);
drop policy if exists "menu_items_delete_own" on public.menu_items;
create policy "menu_items_delete_own" on public.menu_items for delete to authenticated using (auth.email() = owner_email);

alter table public.moderation_flags enable row level security;
drop policy if exists "moderation_flags_select_authenticated" on public.moderation_flags;
create policy "moderation_flags_select_authenticated" on public.moderation_flags for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "moderation_flags_write_authenticated" on public.moderation_flags;
create policy "moderation_flags_write_authenticated" on public.moderation_flags for all to authenticated using (true) with check (true);

alter table public.music_albums enable row level security;
drop policy if exists "music_albums_select_authenticated" on public.music_albums;
create policy "music_albums_select_authenticated" on public.music_albums for select to authenticated using (true);
drop policy if exists "music_albums_insert_own" on public.music_albums;
create policy "music_albums_insert_own" on public.music_albums for insert to authenticated with check (auth.email() = artist_email);
drop policy if exists "music_albums_update_own" on public.music_albums;
create policy "music_albums_update_own" on public.music_albums for update to authenticated using (auth.email() = artist_email) with check (auth.email() = artist_email);
drop policy if exists "music_albums_delete_own" on public.music_albums;
create policy "music_albums_delete_own" on public.music_albums for delete to authenticated using (auth.email() = artist_email);

alter table public.music_contracts enable row level security;
drop policy if exists "music_contracts_select_authenticated" on public.music_contracts;
create policy "music_contracts_select_authenticated" on public.music_contracts for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "music_contracts_write_authenticated" on public.music_contracts;
create policy "music_contracts_write_authenticated" on public.music_contracts for all to authenticated using (true) with check (true);

alter table public.music_deal_applications enable row level security;
drop policy if exists "music_deal_applications_select_authenticated" on public.music_deal_applications;
create policy "music_deal_applications_select_authenticated" on public.music_deal_applications for select to authenticated using (true);
drop policy if exists "music_deal_applications_insert_own" on public.music_deal_applications;
create policy "music_deal_applications_insert_own" on public.music_deal_applications for insert to authenticated with check (auth.email() = artist_email);
drop policy if exists "music_deal_applications_update_own" on public.music_deal_applications;
create policy "music_deal_applications_update_own" on public.music_deal_applications for update to authenticated using (auth.email() = artist_email) with check (auth.email() = artist_email);
drop policy if exists "music_deal_applications_delete_own" on public.music_deal_applications;
create policy "music_deal_applications_delete_own" on public.music_deal_applications for delete to authenticated using (auth.email() = artist_email);

alter table public.music_distributions enable row level security;
drop policy if exists "music_distributions_select_authenticated" on public.music_distributions;
create policy "music_distributions_select_authenticated" on public.music_distributions for select to authenticated using (true);
drop policy if exists "music_distributions_insert_own" on public.music_distributions;
create policy "music_distributions_insert_own" on public.music_distributions for insert to authenticated with check (auth.email() = artist_email);
drop policy if exists "music_distributions_update_own" on public.music_distributions;
create policy "music_distributions_update_own" on public.music_distributions for update to authenticated using (auth.email() = artist_email) with check (auth.email() = artist_email);
drop policy if exists "music_distributions_delete_own" on public.music_distributions;
create policy "music_distributions_delete_own" on public.music_distributions for delete to authenticated using (auth.email() = artist_email);

alter table public.music_masterings enable row level security;
drop policy if exists "music_masterings_select_authenticated" on public.music_masterings;
create policy "music_masterings_select_authenticated" on public.music_masterings for select to authenticated using (true);
drop policy if exists "music_masterings_insert_own" on public.music_masterings;
create policy "music_masterings_insert_own" on public.music_masterings for insert to authenticated with check (auth.email() = artist_email);
drop policy if exists "music_masterings_update_own" on public.music_masterings;
create policy "music_masterings_update_own" on public.music_masterings for update to authenticated using (auth.email() = artist_email) with check (auth.email() = artist_email);
drop policy if exists "music_masterings_delete_own" on public.music_masterings;
create policy "music_masterings_delete_own" on public.music_masterings for delete to authenticated using (auth.email() = artist_email);

alter table public.music_tracks enable row level security;
drop policy if exists "music_tracks_select_authenticated" on public.music_tracks;
create policy "music_tracks_select_authenticated" on public.music_tracks for select to authenticated using (true);
drop policy if exists "music_tracks_insert_own" on public.music_tracks;
create policy "music_tracks_insert_own" on public.music_tracks for insert to authenticated with check (auth.email() = artist_email);
drop policy if exists "music_tracks_update_own" on public.music_tracks;
create policy "music_tracks_update_own" on public.music_tracks for update to authenticated using (auth.email() = artist_email) with check (auth.email() = artist_email);
drop policy if exists "music_tracks_delete_own" on public.music_tracks;
create policy "music_tracks_delete_own" on public.music_tracks for delete to authenticated using (auth.email() = artist_email);

alter table public.news_posts enable row level security;
drop policy if exists "news_posts_select_authenticated" on public.news_posts;
create policy "news_posts_select_authenticated" on public.news_posts for select to authenticated using (true);
drop policy if exists "news_posts_insert_own" on public.news_posts;
create policy "news_posts_insert_own" on public.news_posts for insert to authenticated with check (auth.email() = author_email);
drop policy if exists "news_posts_update_own" on public.news_posts;
create policy "news_posts_update_own" on public.news_posts for update to authenticated using (auth.email() = author_email) with check (auth.email() = author_email);
drop policy if exists "news_posts_delete_own" on public.news_posts;
create policy "news_posts_delete_own" on public.news_posts for delete to authenticated using (auth.email() = author_email);

alter table public.notification_preferences enable row level security;
drop policy if exists "notification_preferences_select_authenticated" on public.notification_preferences;
create policy "notification_preferences_select_authenticated" on public.notification_preferences for select to authenticated using (true);
drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own" on public.notification_preferences for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own" on public.notification_preferences for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own" on public.notification_preferences for delete to authenticated using (auth.email() = user_email);

alter table public.notifications enable row level security;
drop policy if exists "notifications_select_authenticated" on public.notifications;
create policy "notifications_select_authenticated" on public.notifications for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "notifications_write_authenticated" on public.notifications;
create policy "notifications_write_authenticated" on public.notifications for all to authenticated using (true) with check (true);

alter table public.onboarding_progress enable row level security;
drop policy if exists "onboarding_progress_select_authenticated" on public.onboarding_progress;
create policy "onboarding_progress_select_authenticated" on public.onboarding_progress for select to authenticated using (true);
drop policy if exists "onboarding_progress_insert_own" on public.onboarding_progress;
create policy "onboarding_progress_insert_own" on public.onboarding_progress for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "onboarding_progress_update_own" on public.onboarding_progress;
create policy "onboarding_progress_update_own" on public.onboarding_progress for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "onboarding_progress_delete_own" on public.onboarding_progress;
create policy "onboarding_progress_delete_own" on public.onboarding_progress for delete to authenticated using (auth.email() = user_email);

alter table public.orders enable row level security;
drop policy if exists "orders_select_authenticated" on public.orders;
create policy "orders_select_authenticated" on public.orders for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "orders_write_authenticated" on public.orders;
create policy "orders_write_authenticated" on public.orders for all to authenticated using (true) with check (true);

alter table public.p2p_escrows enable row level security;
drop policy if exists "p2p_escrows_select_authenticated" on public.p2p_escrows;
create policy "p2p_escrows_select_authenticated" on public.p2p_escrows for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "p2p_escrows_write_authenticated" on public.p2p_escrows;
create policy "p2p_escrows_write_authenticated" on public.p2p_escrows for all to authenticated using (true) with check (true);

alter table public.p2p_orders enable row level security;
drop policy if exists "p2p_orders_select_authenticated" on public.p2p_orders;
create policy "p2p_orders_select_authenticated" on public.p2p_orders for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "p2p_orders_write_authenticated" on public.p2p_orders;
create policy "p2p_orders_write_authenticated" on public.p2p_orders for all to authenticated using (true) with check (true);

alter table public.p2p_transactions enable row level security;
drop policy if exists "p2p_transactions_select_authenticated" on public.p2p_transactions;
create policy "p2p_transactions_select_authenticated" on public.p2p_transactions for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "p2p_transactions_write_authenticated" on public.p2p_transactions;
create policy "p2p_transactions_write_authenticated" on public.p2p_transactions for all to authenticated using (true) with check (true);

alter table public.password_entries enable row level security;
drop policy if exists "password_entries_select_authenticated" on public.password_entries;
create policy "password_entries_select_authenticated" on public.password_entries for select to authenticated using (true);
drop policy if exists "password_entries_insert_own" on public.password_entries;
create policy "password_entries_insert_own" on public.password_entries for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "password_entries_update_own" on public.password_entries;
create policy "password_entries_update_own" on public.password_entries for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "password_entries_delete_own" on public.password_entries;
create policy "password_entries_delete_own" on public.password_entries for delete to authenticated using (auth.email() = user_email);

alter table public.payment_cards enable row level security;
drop policy if exists "payment_cards_select_authenticated" on public.payment_cards;
create policy "payment_cards_select_authenticated" on public.payment_cards for select to authenticated using (true);
drop policy if exists "payment_cards_insert_own" on public.payment_cards;
create policy "payment_cards_insert_own" on public.payment_cards for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "payment_cards_update_own" on public.payment_cards;
create policy "payment_cards_update_own" on public.payment_cards for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "payment_cards_delete_own" on public.payment_cards;
create policy "payment_cards_delete_own" on public.payment_cards for delete to authenticated using (auth.email() = user_email);

alter table public.payment_methods enable row level security;
drop policy if exists "payment_methods_select_authenticated" on public.payment_methods;
create policy "payment_methods_select_authenticated" on public.payment_methods for select to authenticated using (true);
drop policy if exists "payment_methods_insert_own" on public.payment_methods;
create policy "payment_methods_insert_own" on public.payment_methods for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "payment_methods_update_own" on public.payment_methods;
create policy "payment_methods_update_own" on public.payment_methods for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "payment_methods_delete_own" on public.payment_methods;
create policy "payment_methods_delete_own" on public.payment_methods for delete to authenticated using (auth.email() = user_email);

alter table public.payment_requests enable row level security;
drop policy if exists "payment_requests_select_authenticated" on public.payment_requests;
create policy "payment_requests_select_authenticated" on public.payment_requests for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "payment_requests_write_authenticated" on public.payment_requests;
create policy "payment_requests_write_authenticated" on public.payment_requests for all to authenticated using (true) with check (true);

alter table public.payments enable row level security;
drop policy if exists "payments_select_authenticated" on public.payments;
create policy "payments_select_authenticated" on public.payments for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "payments_write_authenticated" on public.payments;
create policy "payments_write_authenticated" on public.payments for all to authenticated using (true) with check (true);

alter table public.payout_methods enable row level security;
drop policy if exists "payout_methods_select_authenticated" on public.payout_methods;
create policy "payout_methods_select_authenticated" on public.payout_methods for select to authenticated using (true);
drop policy if exists "payout_methods_insert_own" on public.payout_methods;
create policy "payout_methods_insert_own" on public.payout_methods for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "payout_methods_update_own" on public.payout_methods;
create policy "payout_methods_update_own" on public.payout_methods for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "payout_methods_delete_own" on public.payout_methods;
create policy "payout_methods_delete_own" on public.payout_methods for delete to authenticated using (auth.email() = user_email);

alter table public.payout_requests enable row level security;
drop policy if exists "payout_requests_select_authenticated" on public.payout_requests;
create policy "payout_requests_select_authenticated" on public.payout_requests for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "payout_requests_write_authenticated" on public.payout_requests;
create policy "payout_requests_write_authenticated" on public.payout_requests for all to authenticated using (true) with check (true);

alter table public.physical_card_requests enable row level security;
drop policy if exists "physical_card_requests_select_authenticated" on public.physical_card_requests;
create policy "physical_card_requests_select_authenticated" on public.physical_card_requests for select to authenticated using (true);
drop policy if exists "physical_card_requests_insert_own" on public.physical_card_requests;
create policy "physical_card_requests_insert_own" on public.physical_card_requests for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "physical_card_requests_update_own" on public.physical_card_requests;
create policy "physical_card_requests_update_own" on public.physical_card_requests for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "physical_card_requests_delete_own" on public.physical_card_requests;
create policy "physical_card_requests_delete_own" on public.physical_card_requests for delete to authenticated using (auth.email() = user_email);

alter table public.playlists enable row level security;
drop policy if exists "playlists_select_authenticated" on public.playlists;
create policy "playlists_select_authenticated" on public.playlists for select to authenticated using (true);
drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own" on public.playlists for insert to authenticated with check (auth.email() = owner_email);
drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own" on public.playlists for update to authenticated using (auth.email() = owner_email) with check (auth.email() = owner_email);
drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own" on public.playlists for delete to authenticated using (auth.email() = owner_email);

alter table public.poll_votes enable row level security;
drop policy if exists "poll_votes_select_authenticated" on public.poll_votes;
create policy "poll_votes_select_authenticated" on public.poll_votes for select to authenticated using (true);
drop policy if exists "poll_votes_insert_own" on public.poll_votes;
create policy "poll_votes_insert_own" on public.poll_votes for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "poll_votes_update_own" on public.poll_votes;
create policy "poll_votes_update_own" on public.poll_votes for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "poll_votes_delete_own" on public.poll_votes;
create policy "poll_votes_delete_own" on public.poll_votes for delete to authenticated using (auth.email() = user_email);

alter table public.portfolio_items enable row level security;
drop policy if exists "portfolio_items_select_authenticated" on public.portfolio_items;
create policy "portfolio_items_select_authenticated" on public.portfolio_items for select to authenticated using (true);
drop policy if exists "portfolio_items_insert_own" on public.portfolio_items;
create policy "portfolio_items_insert_own" on public.portfolio_items for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "portfolio_items_update_own" on public.portfolio_items;
create policy "portfolio_items_update_own" on public.portfolio_items for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "portfolio_items_delete_own" on public.portfolio_items;
create policy "portfolio_items_delete_own" on public.portfolio_items for delete to authenticated using (auth.email() = user_email);

alter table public.ppv_contents enable row level security;
drop policy if exists "ppv_contents_select_authenticated" on public.ppv_contents;
create policy "ppv_contents_select_authenticated" on public.ppv_contents for select to authenticated using (true);
drop policy if exists "ppv_contents_insert_own" on public.ppv_contents;
create policy "ppv_contents_insert_own" on public.ppv_contents for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "ppv_contents_update_own" on public.ppv_contents;
create policy "ppv_contents_update_own" on public.ppv_contents for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "ppv_contents_delete_own" on public.ppv_contents;
create policy "ppv_contents_delete_own" on public.ppv_contents for delete to authenticated using (auth.email() = creator_email);

alter table public.ppv_purchases enable row level security;
drop policy if exists "ppv_purchases_select_authenticated" on public.ppv_purchases;
create policy "ppv_purchases_select_authenticated" on public.ppv_purchases for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "ppv_purchases_write_authenticated" on public.ppv_purchases;
create policy "ppv_purchases_write_authenticated" on public.ppv_purchases for all to authenticated using (true) with check (true);

alter table public.properties enable row level security;
drop policy if exists "properties_select_authenticated" on public.properties;
create policy "properties_select_authenticated" on public.properties for select to authenticated using (true);
drop policy if exists "properties_insert_own" on public.properties;
create policy "properties_insert_own" on public.properties for insert to authenticated with check (auth.email() = created_by);
drop policy if exists "properties_update_own" on public.properties;
create policy "properties_update_own" on public.properties for update to authenticated using (auth.email() = created_by) with check (auth.email() = created_by);
drop policy if exists "properties_delete_own" on public.properties;
create policy "properties_delete_own" on public.properties for delete to authenticated using (auth.email() = created_by);

alter table public.property_bookings enable row level security;
drop policy if exists "property_bookings_select_authenticated" on public.property_bookings;
create policy "property_bookings_select_authenticated" on public.property_bookings for select to authenticated using (true);
drop policy if exists "property_bookings_insert_own" on public.property_bookings;
create policy "property_bookings_insert_own" on public.property_bookings for insert to authenticated with check (auth.email() = host_email);
drop policy if exists "property_bookings_update_own" on public.property_bookings;
create policy "property_bookings_update_own" on public.property_bookings for update to authenticated using (auth.email() = host_email) with check (auth.email() = host_email);
drop policy if exists "property_bookings_delete_own" on public.property_bookings;
create policy "property_bookings_delete_own" on public.property_bookings for delete to authenticated using (auth.email() = host_email);

alter table public.provider_availabilities enable row level security;
drop policy if exists "provider_availabilities_select_authenticated" on public.provider_availabilities;
create policy "provider_availabilities_select_authenticated" on public.provider_availabilities for select to authenticated using (true);
drop policy if exists "provider_availabilities_insert_own" on public.provider_availabilities;
create policy "provider_availabilities_insert_own" on public.provider_availabilities for insert to authenticated with check (auth.email() = provider_email);
drop policy if exists "provider_availabilities_update_own" on public.provider_availabilities;
create policy "provider_availabilities_update_own" on public.provider_availabilities for update to authenticated using (auth.email() = provider_email) with check (auth.email() = provider_email);
drop policy if exists "provider_availabilities_delete_own" on public.provider_availabilities;
create policy "provider_availabilities_delete_own" on public.provider_availabilities for delete to authenticated using (auth.email() = provider_email);

alter table public.provider_onboardings enable row level security;
drop policy if exists "provider_onboardings_select_authenticated" on public.provider_onboardings;
create policy "provider_onboardings_select_authenticated" on public.provider_onboardings for select to authenticated using (true);
drop policy if exists "provider_onboardings_insert_own" on public.provider_onboardings;
create policy "provider_onboardings_insert_own" on public.provider_onboardings for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "provider_onboardings_update_own" on public.provider_onboardings;
create policy "provider_onboardings_update_own" on public.provider_onboardings for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "provider_onboardings_delete_own" on public.provider_onboardings;
create policy "provider_onboardings_delete_own" on public.provider_onboardings for delete to authenticated using (auth.email() = user_email);

alter table public.provider_verifications enable row level security;
drop policy if exists "provider_verifications_select_authenticated" on public.provider_verifications;
create policy "provider_verifications_select_authenticated" on public.provider_verifications for select to authenticated using (true);
drop policy if exists "provider_verifications_insert_own" on public.provider_verifications;
create policy "provider_verifications_insert_own" on public.provider_verifications for insert to authenticated with check (auth.email() = provider_email);
drop policy if exists "provider_verifications_update_own" on public.provider_verifications;
create policy "provider_verifications_update_own" on public.provider_verifications for update to authenticated using (auth.email() = provider_email) with check (auth.email() = provider_email);
drop policy if exists "provider_verifications_delete_own" on public.provider_verifications;
create policy "provider_verifications_delete_own" on public.provider_verifications for delete to authenticated using (auth.email() = provider_email);

alter table public.qa_questions enable row level security;
drop policy if exists "qa_questions_select_authenticated" on public.qa_questions;
create policy "qa_questions_select_authenticated" on public.qa_questions for select to authenticated using (true);
drop policy if exists "qa_questions_insert_own" on public.qa_questions;
create policy "qa_questions_insert_own" on public.qa_questions for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "qa_questions_update_own" on public.qa_questions;
create policy "qa_questions_update_own" on public.qa_questions for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "qa_questions_delete_own" on public.qa_questions;
create policy "qa_questions_delete_own" on public.qa_questions for delete to authenticated using (auth.email() = user_email);

alter table public.ratings enable row level security;
drop policy if exists "ratings_select_authenticated" on public.ratings;
create policy "ratings_select_authenticated" on public.ratings for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "ratings_write_authenticated" on public.ratings;
create policy "ratings_write_authenticated" on public.ratings for all to authenticated using (true) with check (true);

alter table public.reels enable row level security;
drop policy if exists "reels_select_authenticated" on public.reels;
create policy "reels_select_authenticated" on public.reels for select to authenticated using (true);
drop policy if exists "reels_insert_own" on public.reels;
create policy "reels_insert_own" on public.reels for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "reels_update_own" on public.reels;
create policy "reels_update_own" on public.reels for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "reels_delete_own" on public.reels;
create policy "reels_delete_own" on public.reels for delete to authenticated using (auth.email() = creator_email);

alter table public.rent_payments enable row level security;
drop policy if exists "rent_payments_select_authenticated" on public.rent_payments;
create policy "rent_payments_select_authenticated" on public.rent_payments for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "rent_payments_write_authenticated" on public.rent_payments;
create policy "rent_payments_write_authenticated" on public.rent_payments for all to authenticated using (true) with check (true);

alter table public.restaurants enable row level security;
drop policy if exists "restaurants_select_authenticated" on public.restaurants;
create policy "restaurants_select_authenticated" on public.restaurants for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "restaurants_write_authenticated" on public.restaurants;
create policy "restaurants_write_authenticated" on public.restaurants for all to authenticated using (true) with check (true);

alter table public.revenue_shares enable row level security;
drop policy if exists "revenue_shares_select_authenticated" on public.revenue_shares;
create policy "revenue_shares_select_authenticated" on public.revenue_shares for select to authenticated using (true);
drop policy if exists "revenue_shares_insert_own" on public.revenue_shares;
create policy "revenue_shares_insert_own" on public.revenue_shares for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "revenue_shares_update_own" on public.revenue_shares;
create policy "revenue_shares_update_own" on public.revenue_shares for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "revenue_shares_delete_own" on public.revenue_shares;
create policy "revenue_shares_delete_own" on public.revenue_shares for delete to authenticated using (auth.email() = creator_email);

alter table public.reviews enable row level security;
drop policy if exists "reviews_select_authenticated" on public.reviews;
create policy "reviews_select_authenticated" on public.reviews for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "reviews_write_authenticated" on public.reviews;
create policy "reviews_write_authenticated" on public.reviews for all to authenticated using (true) with check (true);

alter table public.ride_requests enable row level security;
drop policy if exists "ride_requests_select_authenticated" on public.ride_requests;
create policy "ride_requests_select_authenticated" on public.ride_requests for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "ride_requests_write_authenticated" on public.ride_requests;
create policy "ride_requests_write_authenticated" on public.ride_requests for all to authenticated using (true) with check (true);

alter table public.royalty_earnings enable row level security;
drop policy if exists "royalty_earnings_select_authenticated" on public.royalty_earnings;
create policy "royalty_earnings_select_authenticated" on public.royalty_earnings for select to authenticated using (true);
drop policy if exists "royalty_earnings_insert_own" on public.royalty_earnings;
create policy "royalty_earnings_insert_own" on public.royalty_earnings for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "royalty_earnings_update_own" on public.royalty_earnings;
create policy "royalty_earnings_update_own" on public.royalty_earnings for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "royalty_earnings_delete_own" on public.royalty_earnings;
create policy "royalty_earnings_delete_own" on public.royalty_earnings for delete to authenticated using (auth.email() = user_email);

alter table public.royalty_payouts enable row level security;
drop policy if exists "royalty_payouts_select_authenticated" on public.royalty_payouts;
create policy "royalty_payouts_select_authenticated" on public.royalty_payouts for select to authenticated using (true);
drop policy if exists "royalty_payouts_insert_own" on public.royalty_payouts;
create policy "royalty_payouts_insert_own" on public.royalty_payouts for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "royalty_payouts_update_own" on public.royalty_payouts;
create policy "royalty_payouts_update_own" on public.royalty_payouts for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "royalty_payouts_delete_own" on public.royalty_payouts;
create policy "royalty_payouts_delete_own" on public.royalty_payouts for delete to authenticated using (auth.email() = user_email);

alter table public.royalty_splits enable row level security;
drop policy if exists "royalty_splits_select_authenticated" on public.royalty_splits;
create policy "royalty_splits_select_authenticated" on public.royalty_splits for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "royalty_splits_write_authenticated" on public.royalty_splits;
create policy "royalty_splits_write_authenticated" on public.royalty_splits for all to authenticated using (true) with check (true);

alter table public.saved_groups enable row level security;
drop policy if exists "saved_groups_select_authenticated" on public.saved_groups;
create policy "saved_groups_select_authenticated" on public.saved_groups for select to authenticated using (true);
drop policy if exists "saved_groups_insert_own" on public.saved_groups;
create policy "saved_groups_insert_own" on public.saved_groups for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "saved_groups_update_own" on public.saved_groups;
create policy "saved_groups_update_own" on public.saved_groups for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "saved_groups_delete_own" on public.saved_groups;
create policy "saved_groups_delete_own" on public.saved_groups for delete to authenticated using (auth.email() = user_email);

alter table public.saved_jobs enable row level security;
drop policy if exists "saved_jobs_select_authenticated" on public.saved_jobs;
create policy "saved_jobs_select_authenticated" on public.saved_jobs for select to authenticated using (true);
drop policy if exists "saved_jobs_insert_own" on public.saved_jobs;
create policy "saved_jobs_insert_own" on public.saved_jobs for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "saved_jobs_update_own" on public.saved_jobs;
create policy "saved_jobs_update_own" on public.saved_jobs for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "saved_jobs_delete_own" on public.saved_jobs;
create policy "saved_jobs_delete_own" on public.saved_jobs for delete to authenticated using (auth.email() = user_email);

alter table public.saved_properties enable row level security;
drop policy if exists "saved_properties_select_authenticated" on public.saved_properties;
create policy "saved_properties_select_authenticated" on public.saved_properties for select to authenticated using (true);
drop policy if exists "saved_properties_insert_own" on public.saved_properties;
create policy "saved_properties_insert_own" on public.saved_properties for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "saved_properties_update_own" on public.saved_properties;
create policy "saved_properties_update_own" on public.saved_properties for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "saved_properties_delete_own" on public.saved_properties;
create policy "saved_properties_delete_own" on public.saved_properties for delete to authenticated using (auth.email() = user_email);

alter table public.service_agreements enable row level security;
drop policy if exists "service_agreements_select_authenticated" on public.service_agreements;
create policy "service_agreements_select_authenticated" on public.service_agreements for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "service_agreements_write_authenticated" on public.service_agreements;
create policy "service_agreements_write_authenticated" on public.service_agreements for all to authenticated using (true) with check (true);

alter table public.service_availability_overrides enable row level security;
drop policy if exists "service_availability_overrides_select_authenticated" on public.service_availability_overrides;
create policy "service_availability_overrides_select_authenticated" on public.service_availability_overrides for select to authenticated using (true);
drop policy if exists "service_availability_overrides_insert_own" on public.service_availability_overrides;
create policy "service_availability_overrides_insert_own" on public.service_availability_overrides for insert to authenticated with check (auth.email() = provider_email);
drop policy if exists "service_availability_overrides_update_own" on public.service_availability_overrides;
create policy "service_availability_overrides_update_own" on public.service_availability_overrides for update to authenticated using (auth.email() = provider_email) with check (auth.email() = provider_email);
drop policy if exists "service_availability_overrides_delete_own" on public.service_availability_overrides;
create policy "service_availability_overrides_delete_own" on public.service_availability_overrides for delete to authenticated using (auth.email() = provider_email);

alter table public.service_bookings enable row level security;
drop policy if exists "service_bookings_select_authenticated" on public.service_bookings;
create policy "service_bookings_select_authenticated" on public.service_bookings for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "service_bookings_write_authenticated" on public.service_bookings;
create policy "service_bookings_write_authenticated" on public.service_bookings for all to authenticated using (true) with check (true);

alter table public.service_contracts enable row level security;
drop policy if exists "service_contracts_select_authenticated" on public.service_contracts;
create policy "service_contracts_select_authenticated" on public.service_contracts for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "service_contracts_write_authenticated" on public.service_contracts;
create policy "service_contracts_write_authenticated" on public.service_contracts for all to authenticated using (true) with check (true);

alter table public.services enable row level security;
drop policy if exists "services_select_authenticated" on public.services;
create policy "services_select_authenticated" on public.services for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "services_write_authenticated" on public.services;
create policy "services_write_authenticated" on public.services for all to authenticated using (true) with check (true);

alter table public.shared_content_libraries enable row level security;
drop policy if exists "shared_content_libraries_select_authenticated" on public.shared_content_libraries;
create policy "shared_content_libraries_select_authenticated" on public.shared_content_libraries for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "shared_content_libraries_write_authenticated" on public.shared_content_libraries;
create policy "shared_content_libraries_write_authenticated" on public.shared_content_libraries for all to authenticated using (true) with check (true);

alter table public.showcase_posts enable row level security;
drop policy if exists "showcase_posts_select_authenticated" on public.showcase_posts;
create policy "showcase_posts_select_authenticated" on public.showcase_posts for select to authenticated using (true);
drop policy if exists "showcase_posts_insert_own" on public.showcase_posts;
create policy "showcase_posts_insert_own" on public.showcase_posts for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "showcase_posts_update_own" on public.showcase_posts;
create policy "showcase_posts_update_own" on public.showcase_posts for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "showcase_posts_delete_own" on public.showcase_posts;
create policy "showcase_posts_delete_own" on public.showcase_posts for delete to authenticated using (auth.email() = creator_email);

alter table public.social_posts enable row level security;
drop policy if exists "social_posts_select_authenticated" on public.social_posts;
create policy "social_posts_select_authenticated" on public.social_posts for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "social_posts_write_authenticated" on public.social_posts;
create policy "social_posts_write_authenticated" on public.social_posts for all to authenticated using (true) with check (true);

alter table public.sponsored_contents enable row level security;
drop policy if exists "sponsored_contents_select_authenticated" on public.sponsored_contents;
create policy "sponsored_contents_select_authenticated" on public.sponsored_contents for select to authenticated using (true);
drop policy if exists "sponsored_contents_insert_own" on public.sponsored_contents;
create policy "sponsored_contents_insert_own" on public.sponsored_contents for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "sponsored_contents_update_own" on public.sponsored_contents;
create policy "sponsored_contents_update_own" on public.sponsored_contents for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "sponsored_contents_delete_own" on public.sponsored_contents;
create policy "sponsored_contents_delete_own" on public.sponsored_contents for delete to authenticated using (auth.email() = creator_email);

alter table public.stakings enable row level security;
drop policy if exists "stakings_select_authenticated" on public.stakings;
create policy "stakings_select_authenticated" on public.stakings for select to authenticated using (true);
drop policy if exists "stakings_insert_own" on public.stakings;
create policy "stakings_insert_own" on public.stakings for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "stakings_update_own" on public.stakings;
create policy "stakings_update_own" on public.stakings for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "stakings_delete_own" on public.stakings;
create policy "stakings_delete_own" on public.stakings for delete to authenticated using (auth.email() = user_email);

alter table public.stock_alerts enable row level security;
drop policy if exists "stock_alerts_select_authenticated" on public.stock_alerts;
create policy "stock_alerts_select_authenticated" on public.stock_alerts for select to authenticated using (true);
drop policy if exists "stock_alerts_insert_own" on public.stock_alerts;
create policy "stock_alerts_insert_own" on public.stock_alerts for insert to authenticated with check (auth.email() = owner_email);
drop policy if exists "stock_alerts_update_own" on public.stock_alerts;
create policy "stock_alerts_update_own" on public.stock_alerts for update to authenticated using (auth.email() = owner_email) with check (auth.email() = owner_email);
drop policy if exists "stock_alerts_delete_own" on public.stock_alerts;
create policy "stock_alerts_delete_own" on public.stock_alerts for delete to authenticated using (auth.email() = owner_email);

alter table public.store_settings enable row level security;
drop policy if exists "store_settings_select_authenticated" on public.store_settings;
create policy "store_settings_select_authenticated" on public.store_settings for select to authenticated using (true);
drop policy if exists "store_settings_insert_own" on public.store_settings;
create policy "store_settings_insert_own" on public.store_settings for insert to authenticated with check (auth.email() = owner_email);
drop policy if exists "store_settings_update_own" on public.store_settings;
create policy "store_settings_update_own" on public.store_settings for update to authenticated using (auth.email() = owner_email) with check (auth.email() = owner_email);
drop policy if exists "store_settings_delete_own" on public.store_settings;
create policy "store_settings_delete_own" on public.store_settings for delete to authenticated using (auth.email() = owner_email);

alter table public.stories enable row level security;
drop policy if exists "stories_select_authenticated" on public.stories;
create policy "stories_select_authenticated" on public.stories for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "stories_write_authenticated" on public.stories;
create policy "stories_write_authenticated" on public.stories for all to authenticated using (true) with check (true);

alter table public.stream_goals enable row level security;
drop policy if exists "stream_goals_select_authenticated" on public.stream_goals;
create policy "stream_goals_select_authenticated" on public.stream_goals for select to authenticated using (true);
drop policy if exists "stream_goals_insert_own" on public.stream_goals;
create policy "stream_goals_insert_own" on public.stream_goals for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "stream_goals_update_own" on public.stream_goals;
create policy "stream_goals_update_own" on public.stream_goals for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "stream_goals_delete_own" on public.stream_goals;
create policy "stream_goals_delete_own" on public.stream_goals for delete to authenticated using (auth.email() = creator_email);

alter table public.streaming_contents enable row level security;
drop policy if exists "streaming_contents_select_authenticated" on public.streaming_contents;
create policy "streaming_contents_select_authenticated" on public.streaming_contents for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "streaming_contents_write_authenticated" on public.streaming_contents;
create policy "streaming_contents_write_authenticated" on public.streaming_contents for all to authenticated using (true) with check (true);

alter table public.stripe_payments enable row level security;
drop policy if exists "stripe_payments_select_authenticated" on public.stripe_payments;
create policy "stripe_payments_select_authenticated" on public.stripe_payments for select to authenticated using (true);
drop policy if exists "stripe_payments_insert_own" on public.stripe_payments;
create policy "stripe_payments_insert_own" on public.stripe_payments for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "stripe_payments_update_own" on public.stripe_payments;
create policy "stripe_payments_update_own" on public.stripe_payments for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "stripe_payments_delete_own" on public.stripe_payments;
create policy "stripe_payments_delete_own" on public.stripe_payments for delete to authenticated using (auth.email() = user_email);

alter table public.subscription_tiers enable row level security;
drop policy if exists "subscription_tiers_select_authenticated" on public.subscription_tiers;
create policy "subscription_tiers_select_authenticated" on public.subscription_tiers for select to authenticated using (true);
drop policy if exists "subscription_tiers_insert_own" on public.subscription_tiers;
create policy "subscription_tiers_insert_own" on public.subscription_tiers for insert to authenticated with check (auth.email() = creator_email);
drop policy if exists "subscription_tiers_update_own" on public.subscription_tiers;
create policy "subscription_tiers_update_own" on public.subscription_tiers for update to authenticated using (auth.email() = creator_email) with check (auth.email() = creator_email);
drop policy if exists "subscription_tiers_delete_own" on public.subscription_tiers;
create policy "subscription_tiers_delete_own" on public.subscription_tiers for delete to authenticated using (auth.email() = creator_email);

alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions_select_authenticated" on public.subscriptions;
create policy "subscriptions_select_authenticated" on public.subscriptions for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "subscriptions_write_authenticated" on public.subscriptions;
create policy "subscriptions_write_authenticated" on public.subscriptions for all to authenticated using (true) with check (true);

alter table public.support_messages enable row level security;
drop policy if exists "support_messages_select_authenticated" on public.support_messages;
create policy "support_messages_select_authenticated" on public.support_messages for select to authenticated using (true);
drop policy if exists "support_messages_insert_own" on public.support_messages;
create policy "support_messages_insert_own" on public.support_messages for insert to authenticated with check (auth.email() = sender_email);
drop policy if exists "support_messages_update_own" on public.support_messages;
create policy "support_messages_update_own" on public.support_messages for update to authenticated using (auth.email() = sender_email) with check (auth.email() = sender_email);
drop policy if exists "support_messages_delete_own" on public.support_messages;
create policy "support_messages_delete_own" on public.support_messages for delete to authenticated using (auth.email() = sender_email);

alter table public.support_tickets enable row level security;
drop policy if exists "support_tickets_select_authenticated" on public.support_tickets;
create policy "support_tickets_select_authenticated" on public.support_tickets for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "support_tickets_write_authenticated" on public.support_tickets;
create policy "support_tickets_write_authenticated" on public.support_tickets for all to authenticated using (true) with check (true);

alter table public.sync_messages enable row level security;
drop policy if exists "sync_messages_select_authenticated" on public.sync_messages;
create policy "sync_messages_select_authenticated" on public.sync_messages for select to authenticated using (true);
drop policy if exists "sync_messages_insert_own" on public.sync_messages;
create policy "sync_messages_insert_own" on public.sync_messages for insert to authenticated with check (auth.email() = sender_email);
drop policy if exists "sync_messages_update_own" on public.sync_messages;
create policy "sync_messages_update_own" on public.sync_messages for update to authenticated using (auth.email() = sender_email) with check (auth.email() = sender_email);
drop policy if exists "sync_messages_delete_own" on public.sync_messages;
create policy "sync_messages_delete_own" on public.sync_messages for delete to authenticated using (auth.email() = sender_email);

alter table public.sync_requests enable row level security;
drop policy if exists "sync_requests_select_authenticated" on public.sync_requests;
create policy "sync_requests_select_authenticated" on public.sync_requests for select to authenticated using (true);
drop policy if exists "sync_requests_insert_own" on public.sync_requests;
create policy "sync_requests_insert_own" on public.sync_requests for insert to authenticated with check (auth.email() = artist_email);
drop policy if exists "sync_requests_update_own" on public.sync_requests;
create policy "sync_requests_update_own" on public.sync_requests for update to authenticated using (auth.email() = artist_email) with check (auth.email() = artist_email);
drop policy if exists "sync_requests_delete_own" on public.sync_requests;
create policy "sync_requests_delete_own" on public.sync_requests for delete to authenticated using (auth.email() = artist_email);

alter table public.tax_reports enable row level security;
drop policy if exists "tax_reports_select_authenticated" on public.tax_reports;
create policy "tax_reports_select_authenticated" on public.tax_reports for select to authenticated using (true);
drop policy if exists "tax_reports_insert_own" on public.tax_reports;
create policy "tax_reports_insert_own" on public.tax_reports for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "tax_reports_update_own" on public.tax_reports;
create policy "tax_reports_update_own" on public.tax_reports for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "tax_reports_delete_own" on public.tax_reports;
create policy "tax_reports_delete_own" on public.tax_reports for delete to authenticated using (auth.email() = user_email);

alter table public.ticket_affiliates enable row level security;
drop policy if exists "ticket_affiliates_select_authenticated" on public.ticket_affiliates;
create policy "ticket_affiliates_select_authenticated" on public.ticket_affiliates for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "ticket_affiliates_write_authenticated" on public.ticket_affiliates;
create policy "ticket_affiliates_write_authenticated" on public.ticket_affiliates for all to authenticated using (true) with check (true);

alter table public.tip_transactions enable row level security;
drop policy if exists "tip_transactions_select_authenticated" on public.tip_transactions;
create policy "tip_transactions_select_authenticated" on public.tip_transactions for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "tip_transactions_write_authenticated" on public.tip_transactions;
create policy "tip_transactions_write_authenticated" on public.tip_transactions for all to authenticated using (true) with check (true);

alter table public.trader_ratings enable row level security;
drop policy if exists "trader_ratings_select_authenticated" on public.trader_ratings;
create policy "trader_ratings_select_authenticated" on public.trader_ratings for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "trader_ratings_write_authenticated" on public.trader_ratings;
create policy "trader_ratings_write_authenticated" on public.trader_ratings for all to authenticated using (true) with check (true);

alter table public.travel_alerts enable row level security;
drop policy if exists "travel_alerts_select_authenticated" on public.travel_alerts;
create policy "travel_alerts_select_authenticated" on public.travel_alerts for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "travel_alerts_write_authenticated" on public.travel_alerts;
create policy "travel_alerts_write_authenticated" on public.travel_alerts for all to authenticated using (true) with check (true);

alter table public.travel_bookings enable row level security;
drop policy if exists "travel_bookings_select_authenticated" on public.travel_bookings;
create policy "travel_bookings_select_authenticated" on public.travel_bookings for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "travel_bookings_write_authenticated" on public.travel_bookings;
create policy "travel_bookings_write_authenticated" on public.travel_bookings for all to authenticated using (true) with check (true);

alter table public.travel_listings enable row level security;
drop policy if exists "travel_listings_select_authenticated" on public.travel_listings;
create policy "travel_listings_select_authenticated" on public.travel_listings for select to authenticated using (true);
drop policy if exists "travel_listings_insert_own" on public.travel_listings;
create policy "travel_listings_insert_own" on public.travel_listings for insert to authenticated with check (auth.email() = provider_email);
drop policy if exists "travel_listings_update_own" on public.travel_listings;
create policy "travel_listings_update_own" on public.travel_listings for update to authenticated using (auth.email() = provider_email) with check (auth.email() = provider_email);
drop policy if exists "travel_listings_delete_own" on public.travel_listings;
create policy "travel_listings_delete_own" on public.travel_listings for delete to authenticated using (auth.email() = provider_email);

alter table public.two_factor_codes enable row level security;
drop policy if exists "two_factor_codes_select_authenticated" on public.two_factor_codes;
create policy "two_factor_codes_select_authenticated" on public.two_factor_codes for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "two_factor_codes_write_authenticated" on public.two_factor_codes;
create policy "two_factor_codes_write_authenticated" on public.two_factor_codes for all to authenticated using (true) with check (true);

alter table public.user_galleries enable row level security;
drop policy if exists "user_galleries_select_authenticated" on public.user_galleries;
create policy "user_galleries_select_authenticated" on public.user_galleries for select to authenticated using (true);
drop policy if exists "user_galleries_insert_own" on public.user_galleries;
create policy "user_galleries_insert_own" on public.user_galleries for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "user_galleries_update_own" on public.user_galleries;
create policy "user_galleries_update_own" on public.user_galleries for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "user_galleries_delete_own" on public.user_galleries;
create policy "user_galleries_delete_own" on public.user_galleries for delete to authenticated using (auth.email() = user_email);

alter table public.user_interactions enable row level security;
drop policy if exists "user_interactions_select_authenticated" on public.user_interactions;
create policy "user_interactions_select_authenticated" on public.user_interactions for select to authenticated using (true);
drop policy if exists "user_interactions_insert_own" on public.user_interactions;
create policy "user_interactions_insert_own" on public.user_interactions for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "user_interactions_update_own" on public.user_interactions;
create policy "user_interactions_update_own" on public.user_interactions for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "user_interactions_delete_own" on public.user_interactions;
create policy "user_interactions_delete_own" on public.user_interactions for delete to authenticated using (auth.email() = user_email);

alter table public.user_interests enable row level security;
drop policy if exists "user_interests_select_authenticated" on public.user_interests;
create policy "user_interests_select_authenticated" on public.user_interests for select to authenticated using (true);
drop policy if exists "user_interests_insert_own" on public.user_interests;
create policy "user_interests_insert_own" on public.user_interests for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "user_interests_update_own" on public.user_interests;
create policy "user_interests_update_own" on public.user_interests for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "user_interests_delete_own" on public.user_interests;
create policy "user_interests_delete_own" on public.user_interests for delete to authenticated using (auth.email() = user_email);

alter table public.user_inventories enable row level security;
drop policy if exists "user_inventories_select_authenticated" on public.user_inventories;
create policy "user_inventories_select_authenticated" on public.user_inventories for select to authenticated using (true);
drop policy if exists "user_inventories_insert_own" on public.user_inventories;
create policy "user_inventories_insert_own" on public.user_inventories for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "user_inventories_update_own" on public.user_inventories;
create policy "user_inventories_update_own" on public.user_inventories for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "user_inventories_delete_own" on public.user_inventories;
create policy "user_inventories_delete_own" on public.user_inventories for delete to authenticated using (auth.email() = user_email);

alter table public.user_job_preferences enable row level security;
drop policy if exists "user_job_preferences_select_authenticated" on public.user_job_preferences;
create policy "user_job_preferences_select_authenticated" on public.user_job_preferences for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "user_job_preferences_write_authenticated" on public.user_job_preferences;
create policy "user_job_preferences_write_authenticated" on public.user_job_preferences for all to authenticated using (true) with check (true);

alter table public.user_presences enable row level security;
drop policy if exists "user_presences_select_authenticated" on public.user_presences;
create policy "user_presences_select_authenticated" on public.user_presences for select to authenticated using (true);
drop policy if exists "user_presences_insert_own" on public.user_presences;
create policy "user_presences_insert_own" on public.user_presences for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "user_presences_update_own" on public.user_presences;
create policy "user_presences_update_own" on public.user_presences for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "user_presences_delete_own" on public.user_presences;
create policy "user_presences_delete_own" on public.user_presences for delete to authenticated using (auth.email() = user_email);

alter table public.user_reviews enable row level security;
drop policy if exists "user_reviews_select_authenticated" on public.user_reviews;
create policy "user_reviews_select_authenticated" on public.user_reviews for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "user_reviews_write_authenticated" on public.user_reviews;
create policy "user_reviews_write_authenticated" on public.user_reviews for all to authenticated using (true) with check (true);

alter table public.user_subscriptions enable row level security;
drop policy if exists "user_subscriptions_select_authenticated" on public.user_subscriptions;
create policy "user_subscriptions_select_authenticated" on public.user_subscriptions for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "user_subscriptions_write_authenticated" on public.user_subscriptions;
create policy "user_subscriptions_write_authenticated" on public.user_subscriptions for all to authenticated using (true) with check (true);

alter table public.user_vehicles enable row level security;
drop policy if exists "user_vehicles_select_authenticated" on public.user_vehicles;
create policy "user_vehicles_select_authenticated" on public.user_vehicles for select to authenticated using (true);
drop policy if exists "user_vehicles_insert_own" on public.user_vehicles;
create policy "user_vehicles_insert_own" on public.user_vehicles for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "user_vehicles_update_own" on public.user_vehicles;
create policy "user_vehicles_update_own" on public.user_vehicles for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "user_vehicles_delete_own" on public.user_vehicles;
create policy "user_vehicles_delete_own" on public.user_vehicles for delete to authenticated using (auth.email() = user_email);

alter table public.utility_accounts enable row level security;
drop policy if exists "utility_accounts_select_authenticated" on public.utility_accounts;
create policy "utility_accounts_select_authenticated" on public.utility_accounts for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "utility_accounts_write_authenticated" on public.utility_accounts;
create policy "utility_accounts_write_authenticated" on public.utility_accounts for all to authenticated using (true) with check (true);

alter table public.video_comments enable row level security;
drop policy if exists "video_comments_select_authenticated" on public.video_comments;
create policy "video_comments_select_authenticated" on public.video_comments for select to authenticated using (true);
drop policy if exists "video_comments_insert_own" on public.video_comments;
create policy "video_comments_insert_own" on public.video_comments for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "video_comments_update_own" on public.video_comments;
create policy "video_comments_update_own" on public.video_comments for update to authenticated using (auth.email() = user_email) with check (auth.email() = user_email);
drop policy if exists "video_comments_delete_own" on public.video_comments;
create policy "video_comments_delete_own" on public.video_comments for delete to authenticated using (auth.email() = user_email);

alter table public.video_likes enable row level security;
drop policy if exists "video_likes_select_authenticated" on public.video_likes;
create policy "video_likes_select_authenticated" on public.video_likes for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "video_likes_write_authenticated" on public.video_likes;
create policy "video_likes_write_authenticated" on public.video_likes for all to authenticated using (true) with check (true);

alter table public.video_posts enable row level security;
drop policy if exists "video_posts_select_authenticated" on public.video_posts;
create policy "video_posts_select_authenticated" on public.video_posts for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "video_posts_write_authenticated" on public.video_posts;
create policy "video_posts_write_authenticated" on public.video_posts for all to authenticated using (true) with check (true);

alter table public.video_templates enable row level security;
drop policy if exists "video_templates_select_authenticated" on public.video_templates;
create policy "video_templates_select_authenticated" on public.video_templates for select to authenticated using (true);
drop policy if exists "video_templates_insert_own" on public.video_templates;
create policy "video_templates_insert_own" on public.video_templates for insert to authenticated with check (auth.email() = created_by);
drop policy if exists "video_templates_update_own" on public.video_templates;
create policy "video_templates_update_own" on public.video_templates for update to authenticated using (auth.email() = created_by) with check (auth.email() = created_by);
drop policy if exists "video_templates_delete_own" on public.video_templates;
create policy "video_templates_delete_own" on public.video_templates for delete to authenticated using (auth.email() = created_by);

alter table public.viewer_analytics enable row level security;
drop policy if exists "viewer_analytics_select_authenticated" on public.viewer_analytics;
create policy "viewer_analytics_select_authenticated" on public.viewer_analytics for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "viewer_analytics_write_authenticated" on public.viewer_analytics;
create policy "viewer_analytics_write_authenticated" on public.viewer_analytics for all to authenticated using (true) with check (true);

alter table public.watch_parties enable row level security;
drop policy if exists "watch_parties_select_authenticated" on public.watch_parties;
create policy "watch_parties_select_authenticated" on public.watch_parties for select to authenticated using (true);
drop policy if exists "watch_parties_insert_own" on public.watch_parties;
create policy "watch_parties_insert_own" on public.watch_parties for insert to authenticated with check (auth.email() = host_email);
drop policy if exists "watch_parties_update_own" on public.watch_parties;
create policy "watch_parties_update_own" on public.watch_parties for update to authenticated using (auth.email() = host_email) with check (auth.email() = host_email);
drop policy if exists "watch_parties_delete_own" on public.watch_parties;
create policy "watch_parties_delete_own" on public.watch_parties for delete to authenticated using (auth.email() = host_email);

alter table public.watch_party_messages enable row level security;
drop policy if exists "watch_party_messages_select_authenticated" on public.watch_party_messages;
create policy "watch_party_messages_select_authenticated" on public.watch_party_messages for select to authenticated using (true);
drop policy if exists "watch_party_messages_insert_own" on public.watch_party_messages;
create policy "watch_party_messages_insert_own" on public.watch_party_messages for insert to authenticated with check (auth.email() = sender_email);
drop policy if exists "watch_party_messages_update_own" on public.watch_party_messages;
create policy "watch_party_messages_update_own" on public.watch_party_messages for update to authenticated using (auth.email() = sender_email) with check (auth.email() = sender_email);
drop policy if exists "watch_party_messages_delete_own" on public.watch_party_messages;
create policy "watch_party_messages_delete_own" on public.watch_party_messages for delete to authenticated using (auth.email() = sender_email);

alter table public.watch_party_playlists enable row level security;
drop policy if exists "watch_party_playlists_select_authenticated" on public.watch_party_playlists;
create policy "watch_party_playlists_select_authenticated" on public.watch_party_playlists for select to authenticated using (true);
-- Multiple plausible owner columns on this table (or none) -- kept permissive for authenticated writers rather than guessed at; tighten later.
drop policy if exists "watch_party_playlists_write_authenticated" on public.watch_party_playlists;
create policy "watch_party_playlists_write_authenticated" on public.watch_party_playlists for all to authenticated using (true) with check (true);

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (auth.uid() = id);

-- =============================================================================
-- Auto-create a profiles row whenever a new auth.users row appears.
-- See header comment: without this, the FIRST profile update a brand-new
-- user makes throws (UserEntity.updateMyProfile / AuthContext.updateProfile
-- both do .update(...).single() with no prior insert), because there is no
-- row yet to update.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

