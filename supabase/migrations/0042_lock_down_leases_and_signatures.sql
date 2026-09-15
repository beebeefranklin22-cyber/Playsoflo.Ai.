-- CRITICAL: leases had "for all using(true) with check(true)" -- any
-- authenticated user could read or rewrite ANY lease in the system,
-- including landlord_signed/tenant_signed, monthly_rent, and status. A
-- legally-significant document (a signed lease agreement) had zero
-- server-side enforcement of who could sign it or set it active.
--
-- Separately, DigitalSignatureModal.jsx has always tried to write
-- landlord_signature/landlord_signed_date/tenant_signature/tenant_signed_date
-- -- none of which exist in this schema -- so signing a lease has been
-- failing outright with a "column not found" error. Adding them here so
-- the feature can work at all, alongside the security fix, rather than
-- leaving it broken.
alter table public.leases add column if not exists landlord_signature text;
alter table public.leases add column if not exists landlord_signed_date timestamptz;
alter table public.leases add column if not exists tenant_signature text;
alter table public.leases add column if not exists tenant_signed_date timestamptz;

drop policy if exists "leases_select_authenticated" on public.leases;
drop policy if exists "leases_select_own" on public.leases;
create policy "leases_select_own" on public.leases
  for select to authenticated
  using (auth.email() = landlord_email or auth.email() = tenant_email);

drop policy if exists "leases_write_authenticated" on public.leases;
drop policy if exists "leases_write_own" on public.leases;
create policy "leases_write_own" on public.leases
  for all to authenticated
  using (auth.email() = landlord_email or auth.email() = tenant_email)
  with check (auth.email() = landlord_email or auth.email() = tenant_email);

-- Column-level protection RLS can't express: a tenant is a legitimate
-- writer of THIS row (e.g. to sign) but must never be able to set the
-- LANDLORD's signature fields, and vice versa. `status` is derived, not
-- client-set -- it becomes 'active' automatically the moment both sides
-- have actually signed, regardless of what the client sends, so a lease
-- can't be flipped active by one party alone.
create or replace function public.protect_lease_signatures() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if auth.email() is distinct from NEW.landlord_email then
      NEW.landlord_signed := OLD.landlord_signed;
      NEW.landlord_signature := OLD.landlord_signature;
      NEW.landlord_signed_date := OLD.landlord_signed_date;
    end if;
    if auth.email() is distinct from NEW.tenant_email then
      NEW.tenant_signed := OLD.tenant_signed;
      NEW.tenant_signature := OLD.tenant_signature;
      NEW.tenant_signed_date := OLD.tenant_signed_date;
    end if;

    if coalesce(NEW.landlord_signed, false) and coalesce(NEW.tenant_signed, false) then
      NEW.status := 'active';
    else
      NEW.status := OLD.status;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_lease_signatures_trg on public.leases;
create trigger protect_lease_signatures_trg
before update on public.leases
for each row execute function public.protect_lease_signatures();
