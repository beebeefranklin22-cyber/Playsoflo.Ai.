-- The signup form (LoginModal.jsx) collects "Full Name" and "Username" and
-- passes both to supabase.auth.signUp's options.data, which lands in
-- auth.users.raw_user_meta_data -- but the on_auth_user_created trigger
-- (handle_new_auth_user, from 0003_checkout_tables.sql) only ever inserted
-- (id, email) into profiles. Every user's typed name has been silently
-- discarded since launch: search results, posts, notifications, etc. all
-- fall back to showing "User" instead of the name they actually entered.
--
-- profiles.username has no unique constraint (confirmed: no such
-- constraint exists in the schema), so copying it here is safe -- it won't
-- make signup fail on a collision. The separate "Choose a Username"
-- onboarding step still runs for anyone whose username is empty, so this
-- doesn't remove that flow, it just also captures what a new signup
-- already typed in the meantime.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill accounts that already exist but never got their name saved.
update public.profiles p
set full_name = coalesce(p.full_name, u.raw_user_meta_data->>'full_name'),
    username = coalesce(p.username, u.raw_user_meta_data->>'username')
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.username is null)
  and (u.raw_user_meta_data->>'full_name' is not null or u.raw_user_meta_data->>'username' is not null);
