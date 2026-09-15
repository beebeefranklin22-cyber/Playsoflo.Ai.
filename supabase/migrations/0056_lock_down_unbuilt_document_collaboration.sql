-- collaborative_documents and document_comments still carry the
-- base44-inherited "_authenticated" policies (using(true) with check(true))
-- from the 64-table audit -- any signed-in user could read, forge, or
-- overwrite any other user's document or comment via a direct Supabase
-- REST call, independent of what the frontend links to.
--
-- Unlike the tables fixed elsewhere in this series, this feature has no
-- reachable entry point at all: SharedDocument.jsx (the only page that
-- renders CollaborativeEditor) has no registered route in
-- src/routes/AppRoutes.jsx, and the schema is missing columns the
-- frontend already expects (title/owner_email/collaborators/viewers on
-- collaborative_documents; author_email/content/parent_comment_id on
-- document_comments) -- there is no real ownership model to scope a
-- policy against yet, and inventing one would mean designing a sharing
-- feature nobody has wired up. Locking both tables to admin-only (rather
-- than leaving them open, as collaborative_videos was left pending a
-- similar decision) closes the direct-API hole without guessing at that
-- design; nothing reachable depends on broader access today.
drop policy if exists "collaborative_documents_select_authenticated" on public.collaborative_documents;
drop policy if exists "collaborative_documents_write_authenticated" on public.collaborative_documents;
create policy "collaborative_documents_admin_only" on public.collaborative_documents
  for all to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));

drop policy if exists "document_comments_select_authenticated" on public.document_comments;
drop policy if exists "document_comments_write_authenticated" on public.document_comments;
create policy "document_comments_admin_only" on public.document_comments
  for all to authenticated
  using (public.is_admin(auth.email()))
  with check (public.is_admin(auth.email()));
