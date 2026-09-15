-- chat_conversations.unread_count has always been typed `integer`, but
-- EVERY create/update call site across the entire app (Messages.jsx,
-- DirectChatModal.jsx, CreateGroupChatModal.jsx, RideChatModal.jsx,
-- BookingChatModal.jsx, P2PChat.jsx, RealtimeChatWindow.jsx,
-- AutoConversationCreator.jsx) writes it as a {email: count} map, and
-- Home.jsx/Messages.jsx read it the same way (conv.unread_count?.[email]).
-- Inserting a JSON object into an integer column is rejected outright by
-- Postgres ("invalid input syntax for type integer") -- confirmed this
-- against a scratch database before writing this fix -- meaning creating
-- a chat conversation through any of these flows has always failed at
-- the database level. Correcting the column type is what actually makes
-- starting a conversation work.
alter table public.chat_conversations alter column unread_count type jsonb using '{}'::jsonb;
alter table public.chat_conversations alter column unread_count set default '{}'::jsonb;
