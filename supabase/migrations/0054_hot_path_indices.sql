-- A scalability review (requested to confirm the platform can handle many
-- concurrent users and many concurrent livestreams) found only 3 indices
-- across the entire ~150-table schema (wallet_transactions,
-- entertainment_tickets, outbound_message_log) -- every other frequently
-- filtered lookup, including chat, notifications, rides, and every
-- livestream sub-feature, has been a sequential scan since day one. That
-- cost grows with table size and multiplies with concurrent query volume,
-- so it gets worse exactly as the user base and stream/message counts
-- grow. Indexing the columns the frontend actually filters/joins on
-- (.eq()/.filter() call sites, and the RLS policy join conditions added
-- throughout this engagement).
create index if not exists chat_messages_conversation_id_idx on public.chat_messages (conversation_id);
create index if not exists chat_messages_sender_email_idx on public.chat_messages (sender_email);
create index if not exists chat_messages_receiver_email_idx on public.chat_messages (receiver_email);

create index if not exists notifications_recipient_email_idx on public.notifications (recipient_email);
create index if not exists notifications_user_email_idx on public.notifications (user_email);

create index if not exists ride_requests_driver_email_idx on public.ride_requests (driver_email);
create index if not exists ride_requests_passenger_email_idx on public.ride_requests (passenger_email);
create index if not exists ride_requests_conversation_id_idx on public.ride_requests (conversation_id);

-- Every livestream sub-feature (chat, reactions, polls, Q&A, co-host
-- requests) is looked up by stream_id on every viewer's screen for the
-- whole duration of a stream -- this is the single most-repeated query
-- shape in the app under "lots of people watching one stream" load.
create index if not exists livestream_chats_stream_id_idx on public.livestream_chats (stream_id);
create index if not exists livestream_chat_messages_stream_id_idx on public.livestream_chat_messages (stream_id);
create index if not exists livestream_reactions_stream_id_idx on public.livestream_reactions (stream_id);
create index if not exists livestream_polls_stream_id_idx on public.livestream_polls (stream_id);
create index if not exists qa_questions_stream_id_idx on public.qa_questions (stream_id);
create index if not exists co_stream_participants_stream_id_idx on public.co_stream_participants (stream_id);
create index if not exists viewer_analytics_content_id_idx on public.viewer_analytics (content_id);
create index if not exists viewer_analytics_viewer_email_idx on public.viewer_analytics (viewer_email);

-- "browse what's live right now" is a full-table predicate on every visit
-- to the streaming/discovery hub -- a partial index keeps it cheap
-- regardless of how large the content library grows, since it only
-- indexes the (small, constantly-changing) set of currently-live rows.
create index if not exists streaming_contents_is_live_idx on public.streaming_contents (is_live) where is_live = true;
create index if not exists streaming_contents_created_by_idx on public.streaming_contents (created_by);
create index if not exists streaming_contents_creator_email_idx on public.streaming_contents (creator_email);

-- Orders/bookings: every "my orders"/"my bookings" dashboard and every
-- provider-side "incoming orders" list filters by one of these.
create index if not exists orders_customer_email_idx on public.orders (customer_email);
create index if not exists orders_provider_email_idx on public.orders (provider_email);
create index if not exists food_orders_customer_email_idx on public.food_orders (customer_email);
create index if not exists food_orders_provider_email_idx on public.food_orders (provider_email);
create index if not exists food_orders_driver_email_idx on public.food_orders (driver_email);
create index if not exists bookings_created_by_idx on public.bookings (created_by);
create index if not exists bookings_host_email_idx on public.bookings (host_email);
create index if not exists service_bookings_customer_email_idx on public.service_bookings (customer_email);
create index if not exists service_bookings_provider_email_idx on public.service_bookings (provider_email);

create index if not exists p2p_orders_seller_email_idx on public.p2p_orders (seller_email);
create index if not exists p2p_orders_buyer_email_idx on public.p2p_orders (buyer_email);
create index if not exists support_tickets_user_email_idx on public.support_tickets (user_email);
create index if not exists support_tickets_assigned_agent_email_idx on public.support_tickets (assigned_agent_email);
