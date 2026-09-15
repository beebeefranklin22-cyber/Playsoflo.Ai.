-- car_rentals_update_involved (0016_car_rental_hub_fixes.sql) lets EITHER
-- renter_email OR provider_email update a rental with no column
-- restriction. CarRentalDocReview.jsx (provider-only UI) sets
-- doc_verification_status to 'verified'/'rejected' plus doc_verified_by/
-- doc_verified_at/doc_rejection_reason and flips status to
-- 'approved'/'rejected' -- but nothing stopped a renter from calling that
-- same update directly and self-approving their own ID/insurance
-- verification. The renter's own legitimate write (CarRentalDocUpload.jsx,
-- submitting documents) only ever needs to set doc_verification_status to
-- 'pending_review', so that one transition stays open to them; the actual
-- verdict and the booking status flip are provider-only. Every other
-- status transition (payment, pickup/dropoff, cancellation) already goes
-- through api/_handlers/car-rental.js under the service role, not this
-- RLS path, so pinning `status` here for non-providers doesn't touch any
-- working flow.
create or replace function public.protect_car_rental_doc_verification() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if auth.email() is distinct from NEW.provider_email then
      if NEW.doc_verification_status is distinct from OLD.doc_verification_status
         and NEW.doc_verification_status is distinct from 'pending_review' then
        NEW.doc_verification_status := OLD.doc_verification_status;
      end if;
      NEW.doc_verified_at := OLD.doc_verified_at;
      NEW.doc_verified_by := OLD.doc_verified_by;
      NEW.doc_rejection_reason := OLD.doc_rejection_reason;
      NEW.status := OLD.status;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_car_rental_doc_verification_trg on public.car_rentals;
create trigger protect_car_rental_doc_verification_trg
before update on public.car_rentals
for each row execute function public.protect_car_rental_doc_verification();
