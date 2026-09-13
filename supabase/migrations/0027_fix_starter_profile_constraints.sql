-- The Supabase project this app deploys against was provisioned with
-- Vercel's default Supabase starter schema already in place, which
-- includes its own `profiles` table with `username text not null unique`
-- (the standard "Next.js + Supabase Auth" starter shape). Migration 0001's
-- `create table if not exists public.profiles (...)` saw that table
-- already existed and skipped creating it, so its NOT NULL constraint on
-- `username` survived untouched -- and every signup broke, since this
-- app's own signup flow never collects a username (it's chosen later in
-- onboarding; see UsernameSetup.jsx). GoTrue surfaces this as a generic
-- "Database error saving new user" with no detail, masking the real
-- constraint violation.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'username' and is_nullable = 'no'
  ) then
    alter table public.profiles alter column username drop not null;
  end if;
end $$;

-- Same starter template also sometimes ships `full_name`/`avatar_url` as
-- NOT NULL -- neither is collected at signup time by this app either.
do $$
declare
  col text;
begin
  foreach col in array array['full_name', 'avatar_url', 'website']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = col and is_nullable = 'no'
    ) then
      execute format('alter table public.profiles alter column %I drop not null', col);
    end if;
  end loop;
end $$;
