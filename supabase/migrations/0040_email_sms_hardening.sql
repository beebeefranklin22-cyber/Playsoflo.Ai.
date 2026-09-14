-- api/_handlers/email.js and sms.js let any authenticated user send
-- arbitrary email/SMS to any recipient through the platform's own Resend
-- domain / Twilio number, with no restriction at all -- a spam/harassment/
-- cost-abuse vector. email.js additionally let the caller set an arbitrary
-- `from` address, which could be used to spoof the sender identity of mail
-- sent through the platform's own domain. `from` is now fixed server-side
-- (see email.js); this table backs a simple per-user, per-channel rate
-- limit (api/_lib/rateLimit.js) applied to both.
create table if not exists public.outbound_message_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  channel text not null,
  user_email text not null
);
create index if not exists outbound_message_log_lookup on public.outbound_message_log (channel, user_email, created_at);
alter table public.outbound_message_log enable row level security;
-- Written only by server handlers via the service-role client, which
-- bypasses RLS -- no policy grants any access to anon/authenticated on
-- purpose.
