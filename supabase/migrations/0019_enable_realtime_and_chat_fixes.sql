-- Every .subscribe() call across the app (Messages.jsx, RealtimeChatWindow,
-- CustomerBookings, LivestreamViewer, BookingProgressTracker, and ~25 more
-- call sites) has always been written against a {type, data, id} payload
-- shape that src/api/entities.js's Entity.subscribe() never actually
-- produced (fixed in this same change, client-side) -- but even with that
-- fixed, Supabase Realtime only broadcasts changes for tables explicitly
-- added to the `supabase_realtime` publication. Add every table any
-- .subscribe() call in the codebase targets, so real-time updates can
-- actually reach the client at all.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'viewer_analytics', 'livestream_chats', 'chat_conversations', 'chat_messages',
    'service_bookings', 'comments', 'service_agreements', 'payments', 'user_reviews',
    'ride_requests', 'marketplace_items', 'co_stream_participants', 'creator_products',
    'qa_questions', 'livestream_polls', 'watch_parties', 'watch_party_messages',
    'document_presences', 'tip_transactions', 'collaborative_documents', 'payment_requests',
    'notifications', 'delivery_orders', 'payment_methods', 'bookings', 'orders',
    'content_purchases', 'car_rentals', 'property_bookings', 'damage_settlements',
    'direct_messages', 'fan_pools', 'music_distributions'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
