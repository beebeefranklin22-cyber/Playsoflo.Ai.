import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';

// Backs cancelRideSecure and matchOptimalDriver.
const CANCELLATION_FEE_BY_STATUS = {
  requested: 0,
  accepted: 5,
  en_route: 5,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const admin = getSupabaseAdmin();
  const { action } = req.body || {};

  try {
    if (action === 'cancel') return res.status(200).json(await cancelRide(admin, user, req.body));
    if (action === 'match_driver') return res.status(200).json(await matchDriver(admin, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('rides error:', action, err);
    return res.status(200).json({ error: err.message });
  }
}

async function cancelRide(admin, user, { ride_id, cancellation_reason }) {
  const { data: ride, error: fetchError } = await admin.from('ride_requests').select('*').eq('id', ride_id).single();
  if (fetchError || !ride) throw new Error('Ride not found');
  if (ride.passenger_email !== user.email) throw new Error('You are not the passenger on this ride');
  if (ride.status === 'cancelled') return { success: true };

  // Recompute the fee server-side rather than trusting the client's number.
  let fee = CANCELLATION_FEE_BY_STATUS[ride.status] ?? 0;
  if (ride.status === 'arrived') fee = (ride.fare_breakdown?.total_fare || 20) * 0.5;

  if (fee > 0 && ride.driver_email) {
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: user.email,
      p_to_email: ride.driver_email,
      p_debit_amount: fee,
      p_credit_amount: fee,
      p_reference_type: 'ride_cancellation_fee',
      p_reference_id: ride_id,
      p_memo: cancellation_reason || null,
    });
    if (moveError) {
      if (String(moveError.message).includes('insufficient balance')) throw new Error('Insufficient balance to pay the cancellation fee');
      throw moveError;
    }
  }

  const { error } = await admin
    .from('ride_requests')
    .update({ status: 'cancelled', cancellation_reason, cancelled_by: user.email })
    .eq('id', ride_id);
  if (error) throw error;

  return { success: true, fee_charged: fee };
}

function haversineMiles([lat1, lon1], [lat2, lon2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function matchDriver(admin, { ride_id }) {
  const { data: ride, error: rideError } = await admin.from('ride_requests').select('*').eq('id', ride_id).single();
  if (rideError || !ride) throw new Error('Ride not found');
  if (!ride.pickup_coords) throw new Error('Ride has no pickup location');

  const { data: candidates, error } = await admin
    .from('profiles')
    .select('email, driver_current_lat, driver_current_lng')
    .eq('driver_is_online', true);
  if (error) throw error;

  const withDistance = (candidates || [])
    .filter((d) => d.driver_current_lat != null && d.driver_current_lng != null)
    .map((d) => ({
      driver_email: d.email,
      distance_miles: haversineMiles(ride.pickup_coords, [d.driver_current_lat, d.driver_current_lng]),
    }))
    .sort((a, b) => a.distance_miles - b.distance_miles);

  const best = withDistance[0];
  if (!best) return { matched: false, message: 'No online drivers available nearby' };

  const { error: updateError } = await admin
    .from('ride_requests')
    .update({ driver_email: best.driver_email, driver_status: 'assigned', status: 'accepted' })
    .eq('id', ride_id);
  if (updateError) throw updateError;

  return { matched: true, driver_email: best.driver_email, distance_miles: Math.round(best.distance_miles * 10) / 10 };
}
