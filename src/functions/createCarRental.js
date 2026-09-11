import { supabase } from '@/lib/supabaseClient';

export async function createCarRental(data = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { error: 'You must be signed in to book' } };

  // Reject overlapping bookings for the same listing (best-effort — see the
  // TOCTOU note below).
  const { data: existing, error: overlapError } = await supabase
    .from('car_rentals')
    .select('id, start_date, end_date, status')
    .eq('listing_id', data.listing_id)
    .neq('status', 'cancelled');
  if (overlapError) return { data: { error: overlapError.message } };

  const newStart = new Date(data.start_date);
  const newEnd = new Date(data.end_date);
  const overlaps = (existing || []).some((r) => {
    const s = new Date(r.start_date);
    const e = new Date(r.end_date);
    return newStart < e && s < newEnd;
  });
  // This check is just for a fast, friendly error -- the real guard is the
  // car_rentals_no_overlap GiST exclusion constraint on the table (handled
  // as a 23P01 error below), which closes the race this check alone can't.
  if (overlaps) return { data: { error: 'These dates are already booked. Please choose different dates.' } };

  const { error, data: row } = await supabase
    .from('car_rentals')
    .insert({
      listing_id: data.listing_id,
      renter_email: session.user.email,
      provider_email: data.provider_email,
      car_make: data.car_make,
      car_model: data.car_model,
      car_year: data.car_year,
      license_plate: data.license_plate,
      car_image: data.car_image,
      rental_type: data.rental_type || 'daily',
      price_per_unit: data.price_per_unit,
      start_date: data.start_date,
      end_date: data.end_date,
      total_amount: data.total_amount,
      insurance_included: !!data.insurance_included,
      insurance_amount: data.insurance_amount || 0,
      delivery_option: data.delivery_option,
      delivery_address: data.delivery_address || null,
      delivery_fee: data.delivery_fee || 0,
      unlock_method: data.unlock_method,
      security_deposit: data.security_deposit || 0,
      verification_required: data.verification_required !== false,
      driver_license_url: data.driver_license_url,
      id_verification_url: data.id_verification_url,
      mileage_limit: data.mileage_limit,
      excess_mileage_fee: data.excess_mileage_fee,
      fuel_policy: data.fuel_policy,
      cancellation_policy: data.cancellation_policy,
      selected_add_ons: data.selected_add_ons || [],
      add_ons_total: data.add_ons_total || 0,
      status: 'pending_payment',
    })
    .select()
    .single();

  if (error) {
    // 23P01 = exclusion_violation -- the real DB-level guard
    // (car_rentals_no_overlap) catching what the check above raced past.
    if (error.code === '23P01') return { data: { error: 'These dates are already booked. Please choose different dates.' } };
    return { data: { error: error.message } };
  }
  return { data: { rental: row } };
}
