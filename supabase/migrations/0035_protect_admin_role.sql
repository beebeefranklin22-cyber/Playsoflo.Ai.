-- CRITICAL: profiles.role (the sole basis for is_admin() and every
-- admin-gated UI/RLS check in the app) had no protection at all --
-- profiles_update_own lets any signed-in user update their own row with no
-- column restriction, and entities.User.update() (src/api/entities.js) is a
-- generic, unrestricted update. Any authenticated user could run
-- User.update(their_own_id, { role: 'admin' }) from the browser console and
-- instantly pass is_admin() everywhere: AdminPanel, SyncLicensingAdmin,
-- every is_admin()-gated table policy.
--
-- Same pattern as protect_balance_columns (0004_lock_down_money_tables.sql):
-- a trigger, not RLS, since only a trigger can express "any column except
-- this one." role is pinned to its existing value (or NULL on insert -- a
-- fresh signup should never start as admin) for any write that isn't the
-- service role. To make someone an admin, do it directly in the Supabase
-- SQL editor (which runs as a superuser/service role, unaffected by this
-- trigger) -- e.g. update public.profiles set role = 'admin' where email = '...'.
create or replace function public.protect_admin_role() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      NEW.role := null;
    else
      NEW.role := OLD.role;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_admin_role_trg on public.profiles;
create trigger protect_admin_role_trg
before insert or update on public.profiles
for each row execute function public.protect_admin_role();
