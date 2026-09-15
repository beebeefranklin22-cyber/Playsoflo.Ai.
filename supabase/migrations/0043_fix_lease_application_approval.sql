-- lease_applications_update_own only ever allowed the APPLICANT to update
-- their own application -- LandlordDashboard.jsx's Approve/Reject buttons
-- call the exact same update (status + landlord_notes) as the landlord,
-- which has always thrown "not allowed" under this RLS (the mutation has
-- no onError, so the UI just silently does nothing). Meanwhile nothing
-- stopped the applicant from setting their OWN application's status to
-- 'approved' directly, since they're the only party RLS ever let write to
-- it at all.
--
-- lease_applications has no landlord_email column -- the landlord is
-- whoever owns the property being applied to (properties.created_by,
-- the same column LandlordDashboard.jsx already uses to find "my
-- properties"). Adds real landlord write access via that join, and a
-- trigger so only the landlord (never the applicant) can move status
-- to approved/rejected or set landlord_notes.
drop policy if exists "lease_applications_update_landlord" on public.lease_applications;
create policy "lease_applications_update_landlord" on public.lease_applications
  for update to authenticated
  using (exists (select 1 from public.properties p where p.id = lease_applications.property_id and p.created_by = auth.email()))
  with check (exists (select 1 from public.properties p where p.id = lease_applications.property_id and p.created_by = auth.email()));

create or replace function public.protect_lease_application_decision() returns trigger
language plpgsql
as $$
declare
  v_is_landlord boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    select exists (
      select 1 from public.properties p where p.id = NEW.property_id and p.created_by = auth.email()
    ) into v_is_landlord;

    if not v_is_landlord then
      NEW.status := OLD.status;
      NEW.landlord_notes := OLD.landlord_notes;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_lease_application_decision_trg on public.lease_applications;
create trigger protect_lease_application_decision_trg
before update on public.lease_applications
for each row execute function public.protect_lease_application_decision();
