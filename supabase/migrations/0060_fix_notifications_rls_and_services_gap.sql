-- notifications and services were both missed in the earlier audits.
--
-- notifications had select/write wide open to every authenticated user --
-- anyone could read every other user's notification feed (rent due
-- reminders, "someone sent you $X", fraud alerts, etc.) and could mark or
-- delete anyone else's notifications. INSERT has to stay permissive:
-- ~80 call sites across the app create a notification for a *different*
-- user (a provider notifying a customer, a landlord notifying a tenant,
-- "someone liked your post") with no server-side layer behind any of
-- them, so a strict "insert only your own recipient" check would break
-- all of them outright. That means any authenticated user can still
-- plant fabricated notification content in another user's inbox today --
-- a real residual risk, not fixed here, that would need those ~80 call
-- sites moved behind a validated server action to close properly. Select/
-- update/delete are scoped to the real recipient now, which closes the
-- read-privacy leak and stops a stranger from tampering with someone
-- else's notifications.
drop policy if exists "notifications_select_authenticated" on public.notifications;
drop policy if exists "notifications_write_authenticated" on public.notifications;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (auth.email() = recipient_email or auth.email() = user_email or public.is_admin(auth.email()));

create policy "notifications_insert_authenticated" on public.notifications
  for insert to authenticated
  with check (true);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (auth.email() = recipient_email or auth.email() = user_email or public.is_admin(auth.email()))
  with check (auth.email() = recipient_email or auth.email() = user_email or public.is_admin(auth.email()));

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (auth.email() = recipient_email or auth.email() = user_email or public.is_admin(auth.email()));

-- services: zero references anywhere in the app (missed when the rest of
-- this bucket was closed out) -- admin-only, same as the rest of Group B.
drop policy if exists "services_select_authenticated" on public.services;
drop policy if exists "services_write_authenticated" on public.services;
create policy "services_admin_only" on public.services
  for all to authenticated
  using (public.is_admin(auth.email())) with check (public.is_admin(auth.email()));
