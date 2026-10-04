-- food_orders was left out of the supabase_realtime publication added in
-- migration 0019, so RestaurantOwnerHub's new-order alert can only ever
-- learn about a new order via its 5s poll, never instantly via
-- Entity.subscribe(). Add it so it behaves like every other order/booking
-- table.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'food_orders'
  ) then
    execute 'alter publication supabase_realtime add table public.food_orders';
  end if;
end $$;
