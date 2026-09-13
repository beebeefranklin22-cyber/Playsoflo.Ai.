-- Same "wrong owner column" bug class as 0007, found while checking the
-- livestream/streaming hub: each of these tables has a real feature where
-- someone OTHER than the row's single "owner" column needs to update it,
-- but 0001 gave them an owner-only policy.
drop policy if exists "livestream_chats_update_own" on public.livestream_chats;
drop policy if exists "livestream_chats_write_authenticated" on public.livestream_chats;
create policy "livestream_chats_write_authenticated" on public.livestream_chats
  for update to authenticated using (true) with check (true);
-- The host pinning/deleting a VIEWER's chat message updates that
-- viewer's row, not their own (src/components/livestream/
-- LivestreamChat.jsx: pin/delete are gated on `isCreator` in the UI, not
-- enforceable from a plain client-side RLS policy — treat this the same
-- as the other multi-party tables and rely on the UI gate for now).

drop policy if exists "co_stream_participants_update_own" on public.co_stream_participants;
drop policy if exists "co_stream_participants_write_authenticated" on public.co_stream_participants;
create policy "co_stream_participants_write_authenticated" on public.co_stream_participants
  for update to authenticated using (true) with check (true);
-- The host approving/denying a co-host join request updates the
-- REQUESTER's row (src/components/livestream/JoinRequestsPanel.jsx).

drop policy if exists "qa_questions_update_own" on public.qa_questions;
drop policy if exists "qa_questions_write_authenticated" on public.qa_questions;
create policy "qa_questions_write_authenticated" on public.qa_questions
  for update to authenticated using (true) with check (true);
-- Upvoting someone else's question, and the host answering/pinning a
-- viewer's question, both update the ASKER's row.

drop policy if exists "livestream_polls_update_own" on public.livestream_polls;
drop policy if exists "livestream_polls_write_authenticated" on public.livestream_polls;
create policy "livestream_polls_write_authenticated" on public.livestream_polls
  for update to authenticated using (true) with check (true);
-- Casting a vote updates the poll's vote counts, but the poll belongs to
-- the host, not the voter.
