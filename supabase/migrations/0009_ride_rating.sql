-- Backs api/rides.js's "rate_driver" action. A passenger rating a driver
-- updates the DRIVER's profile row (driver_rating, driver_total_ratings),
-- which the passenger doesn't own — profiles intentionally does NOT get a
-- blanket permissive update policy (unlike the multi-party interaction
-- tables) since it also holds the wallet balance columns and other
-- sensitive fields; a single "anyone can update any profile" policy would
-- undo the balance-tampering protection from 0004. Instead this is a
-- dedicated, atomic RPC restricted to service_role, same shape as
-- wallet_move: it does the increment-and-average server-side so two
-- simultaneous ratings can't clobber each other via a read-then-write
-- race from two different clients.
create or replace function public.rate_driver(p_driver_email text, p_rating numeric) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_total integer;
  v_avg numeric;
  v_new_total integer;
  v_new_avg numeric;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  select id, coalesce(driver_total_ratings, 0), coalesce(driver_rating, 0)
    into v_id, v_total, v_avg
  from public.profiles
  where email = p_driver_email
  for update;

  if v_id is null then
    raise exception 'driver profile not found for %', p_driver_email;
  end if;

  v_new_total := v_total + 1;
  v_new_avg := ((v_avg * v_total) + p_rating) / v_new_total;

  update public.profiles
  set driver_rating = v_new_avg, driver_total_ratings = v_new_total, updated_at = now()
  where id = v_id;

  return jsonb_build_object('success', true, 'driver_rating', v_new_avg, 'driver_total_ratings', v_new_total);
end;
$$;

revoke all on function public.rate_driver(text, numeric) from public;
revoke all on function public.rate_driver(text, numeric) from anon;
revoke all on function public.rate_driver(text, numeric) from authenticated;
grant execute on function public.rate_driver(text, numeric) to service_role;
