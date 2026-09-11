-- Real double-booking prevention for car_rentals, mirroring the
-- property_bookings_no_overlap pattern (0013). createCarRental.js's
-- check-then-insert overlap check is TOCTOU-racy (its own comment already
-- says so); this closes it with a DB-level GiST exclusion constraint.
--
-- start_date/end_date are timestamptz, but CarRentals.jsx's booking form
-- only ever collects whole calendar days (<input type="date">, converted
-- via `new Date(x).toISOString()` -- always midnight UTC), so casting to
-- `date` loses no real information and is what makes a GiST exclusion
-- constraint expressible at all: timestamptz -> date is only STABLE (it
-- depends on session timezone), and an exclusion constraint's index
-- expression must be IMMUTABLE.
alter table public.car_rentals alter column start_date type date using start_date::date;
alter table public.car_rentals alter column end_date type date using end_date::date;

create extension if not exists btree_gist;

alter table public.car_rentals drop constraint if exists car_rentals_no_overlap;
alter table public.car_rentals
  add constraint car_rentals_no_overlap
  exclude using gist (
    listing_id with =,
    daterange(start_date, end_date, '[)') with &&
  )
  where (status in ('pending_payment', 'confirmed', 'in_progress'));

alter table public.car_rentals drop constraint if exists car_rentals_dates_valid;
alter table public.car_rentals
  add constraint car_rentals_dates_valid
  check (start_date is null or end_date is null or end_date > start_date);
