-- Several admin actions have been silently broken since RLS was locked
-- down to real parties: DisputeManagement.jsx (admin dispute resolution),
-- AdminDisputeResolution.jsx (P2P escrow resolution), and UserManagement.jsx
-- (driver online/offline toggle) all use base44.asServiceRole -- which is
-- NOT a real privilege bypass, just the same authenticated client -- so
-- every one of these has been throwing "not allowed" with no onError shown,
-- making the button look broken with no explanation. is_admin() (the same
-- function protect_admin_role, 0035, makes trustworthy) already has a
-- precedent for exactly this: provider_verifications_update_own
-- (0021_services_marketplace_fixes.sql) added it as an escape hatch
-- alongside the owner check. Extending that same pattern here.
drop policy if exists "disputes_write_own" on public.disputes;
create policy "disputes_write_own" on public.disputes
  for all to authenticated
  using (
    auth.email() = initiator_email or auth.email() = respondent_email
    or auth.email() = complainant_email or auth.email() = disputer_email
    or public.is_admin(auth.email())
  )
  with check (
    auth.email() = initiator_email or auth.email() = respondent_email
    or auth.email() = complainant_email or auth.email() = disputer_email
    or public.is_admin(auth.email())
  );

drop policy if exists "p2p_escrows_write_own" on public.p2p_escrows;
create policy "p2p_escrows_write_own" on public.p2p_escrows
  for all to authenticated
  using (auth.email() = buyer_email or auth.email() = seller_email or public.is_admin(auth.email()))
  with check (auth.email() = buyer_email or auth.email() = seller_email or public.is_admin(auth.email()));

-- UserManagement.jsx's driver online/offline toggle updates ANOTHER user's
-- profile row -- profiles_update_own only ever allowed auth.uid() = id.
-- Safe to extend to admins: profiles.role/soflo_coins/balance columns stay
-- protected by protect_balance_columns/protect_admin_role regardless of
-- what this RLS policy itself allows, since those are trigger-enforced,
-- not RLS-enforced.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin(auth.email()))
  with check (auth.uid() = id or public.is_admin(auth.email()));

-- Layout.jsx reads currentUser.is_support_agent to decide who sees the
-- support console link, but no such column exists anywhere in this
-- schema -- the write silently fails/never persists today, so this isn't
-- currently exploitable, but the feature can't work either. Adding it
-- alongside the same protection profiles.role already needed: an
-- admin-adjacent access flag must never be self-grantable.
alter table public.profiles add column if not exists is_support_agent boolean not null default false;

create or replace function public.protect_admin_role() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      NEW.role := null;
      NEW.is_support_agent := false;
    else
      NEW.role := OLD.role;
      NEW.is_support_agent := OLD.is_support_agent;
    end if;
  end if;
  return NEW;
end;
$$;

-- content_edits_update_own only ever let the EDITOR (the person proposing
-- the change) update the row -- so the real reviewer (per
-- ContentEditWorkflow.jsx, the owner of the content being edited) has
-- always been blocked from approving/rejecting anything but their own
-- submissions, while the submitter was the only party RLS ever let write
-- status/reviewed_by at all, i.e. could approve their own edit.
drop policy if exists "content_edits_update_own" on public.content_edits;
create policy "content_edits_update_own" on public.content_edits
  for update to authenticated
  using (
    auth.email() = editor_email
    or exists (select 1 from public.streaming_contents sc where sc.id = content_edits.content_id and sc.created_by = auth.email())
  )
  with check (
    auth.email() = editor_email
    or exists (select 1 from public.streaming_contents sc where sc.id = content_edits.content_id and sc.created_by = auth.email())
  );

-- Column protection RLS can't express: the editor can still amend their
-- own pending submission, but only the content's real owner (the reviewer)
-- may decide it.
create or replace function public.protect_content_edit_review() returns trigger
language plpgsql
as $$
declare
  v_is_reviewer boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    select exists (
      select 1 from public.streaming_contents sc where sc.id = NEW.content_id and sc.created_by = auth.email()
    ) into v_is_reviewer;

    if not v_is_reviewer then
      NEW.status := OLD.status;
      NEW.reviewed_by := OLD.reviewed_by;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_content_edit_review_trg on public.content_edits;
create trigger protect_content_edit_review_trg
before update on public.content_edits
for each row execute function public.protect_content_edit_review();

-- SupportDashboard.jsx is gated client-side only (redirect if role !==
-- 'admin') -- support_tickets itself was "using(true)"/"for all
-- using(true)", so any signed-in user could list, reassign, or close
-- every user's support tickets directly through the API.
drop policy if exists "support_tickets_select_authenticated" on public.support_tickets;
drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own" on public.support_tickets
  for select to authenticated
  using (auth.email() = user_email or auth.email() = assigned_agent_email or public.is_admin(auth.email()));

drop policy if exists "support_tickets_write_authenticated" on public.support_tickets;
drop policy if exists "support_tickets_write_own" on public.support_tickets;
create policy "support_tickets_write_own" on public.support_tickets
  for all to authenticated
  using (auth.email() = user_email or auth.email() = assigned_agent_email or public.is_admin(auth.email()))
  with check (auth.email() = user_email or auth.email() = assigned_agent_email or public.is_admin(auth.email()));
