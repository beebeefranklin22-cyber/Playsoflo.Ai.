import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent } from './_lib/stripe.js';
import { round2, cleanError } from './_lib/orderHelpers.js';

// Backs cancelRideSecure, matchOptimalDriver, and rateDriver.
const CANCELLATION_FEE_BY_STATUS = {
  requested: 0,
  accepted: 5,
  en_route: 5,
};

// Same split HailRideModal/RideRequestCard already advertise to users
// ("You earn (88%)") -- kept here so the server charges/pays out the exact
// number the UI promised, not a client-supplied total.
const DRIVER_EARNINGS_RATE = 0.88;

// A driver actively working a ride can't be matched or accept another one.
// "en_route" here means driving to pickup, "accepted" means picked up and
// driving to dropoff (see RideRequestCard.jsx's status-driven UI) -- both
// count as "busy".
const ACTIVE_DRIVER_STATUSES = ['accepted', 'en_route', 'arrived'];

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
    if (action === 'request_ride') return res.status(200).json(await requestRide(admin, user, req.body));
    if (action === 'accept') return res.status(200).json(await acceptRide(admin, user, req.body));
    if (action === 'complete') return res.status(200).json(await completeRide(admin, user, req.body));
    if (action === 'cancel') return res.status(200).json(await cancelRide(admin, user, req.body));
    if (action === 'match_driver') return res.status(200).json(await matchDriver(admin, req.body));
    if (action === 'rate_driver') return res.status(200).json(await rateDriver(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('rides error:', action, err);
    return res.status(200).json({ error: cleanError(err.message) });
  }
}

// Recomputes the fare server-side from the vehicle rate card + route
// estimate rather than trusting a client-computed total, so editing
// fare_breakdown.total_fare in the browser can't under-charge a ride.
function priceRide(vehicleClassDetails, estimatedDistanceMiles, estimatedDurationMinutes) {
  const baseFare = vehicleClassDetails?.base_price || 0;
  const distanceFare = (vehicleClassDetails?.price_per_mile || 0) * (estimatedDistanceMiles || 0);
  const timeFare = (vehicleClassDetails?.price_per_minute || 0) * (estimatedDurationMinutes || 0);
  const totalFare = Math.max(round2(baseFare + distanceFare + timeFare), 1.0);
  const driverEarnings = round2(totalFare * DRIVER_EARNINGS_RATE);
  const platformFee = round2(totalFare - driverEarnings);
  return { baseFare: round2(baseFare), distanceFare: round2(distanceFare), timeFare: round2(timeFare), totalFare, driverEarnings, platformFee };
}

async function requestRide(admin, user, body) {
  const {
    pickup_address, dropoff_address, ride_type, vehicle_class_details, is_shared, max_passengers,
    is_for_someone_else, recipient_name, recipient_phone, pickup_coords, dropoff_coords, route_geometry,
    estimated_distance_miles, estimated_duration_minutes, rider_preferences,
    payment_method, saved_payment_method_id, confirm_payment_intent_id,
  } = body;

  if (!pickup_address || !dropoff_address) throw new Error('pickup_address and dropoff_address are required');
  if (!payment_method) throw new Error('payment_method is required');

  const fare = priceRide(vehicle_class_details, estimated_distance_miles, estimated_duration_minutes);

  // Fare is collected up front (like a real rideshare hold) and paid out to
  // whichever driver ends up completing the ride -- there's no driver yet
  // at request time. Wallet: debit the passenger now with no credit
  // destination (an escrow hold, credited out at ride completion). Card:
  // charge the full fare now; the driver's cut is credited from that
  // charge when the ride completes.
  let paymentIntentId = null;
  if (payment_method === 'wallet') {
    const { error } = await admin.rpc('wallet_move', {
      p_from_email: user.email, p_to_email: null, p_debit_amount: fare.totalFare, p_credit_amount: null,
      p_reference_type: 'ride_fare', p_reference_id: null, p_memo: `Ride from ${pickup_address} to ${dropoff_address}`,
    });
    if (error) throw error;
  } else if (payment_method === 'card') {
    if (confirm_payment_intent_id) {
      const intent = await retrievePaymentIntent(confirm_payment_intent_id);
      if (intent.status !== 'succeeded') throw new Error(`Payment not completed (status: ${intent.status})`);
      paymentIntentId = intent.id;
    } else if (saved_payment_method_id) {
      const { data: pmRow, error: pmError } = await admin
        .from('payment_methods')
        .select('stripe_customer_id, stripe_payment_method_id')
        .eq('id', saved_payment_method_id)
        .eq('user_email', user.email)
        .eq('status', 'active')
        .single();
      if (pmError || !pmRow?.stripe_payment_method_id || !pmRow?.stripe_customer_id) {
        throw new Error('Saved payment method not found');
      }
      const intent = await createPaymentIntent({
        amountCents: Math.round(fare.totalFare * 100), currency: 'usd',
        metadata: { order_type: 'ride_fare', customer_email: user.email },
        customerId: pmRow.stripe_customer_id, paymentMethodId: pmRow.stripe_payment_method_id, offSession: true,
      });
      if (intent.status !== 'succeeded') {
        throw new Error(`This card needs additional verification (status: ${intent.status}). Please use a new card instead.`);
      }
      paymentIntentId = intent.id;
    } else {
      const intent = await createPaymentIntent({
        amountCents: Math.round(fare.totalFare * 100), currency: 'usd',
        metadata: { order_type: 'ride_fare', customer_email: user.email },
      });
      return {
        needsClientAction: true,
        client_secret: intent.client_secret,
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        payment_intent_id: intent.id,
      };
    }
  } else {
    throw new Error(`Unknown payment_method "${payment_method}"`);
  }

  const { data: row, error } = await admin.from('ride_requests').insert({
    created_by: user.email,
    passenger_email: user.email,
    pickup_address, dropoff_address, ride_type,
    vehicle_class_details: vehicle_class_details || null,
    status: 'requested',
    driver_status: 'pending',
    is_shared: !!is_shared,
    max_passengers: max_passengers || 1,
    is_for_someone_else: !!is_for_someone_else,
    recipient_name: is_for_someone_else ? recipient_name : null,
    recipient_phone: is_for_someone_else ? recipient_phone : null,
    pickup_coords: pickup_coords || null,
    dropoff_coords: dropoff_coords || null,
    route_geometry: route_geometry || null,
    estimated_distance_miles: estimated_distance_miles || null,
    estimated_duration_minutes: estimated_duration_minutes || null,
    rider_preferences: rider_preferences || null,
    fare_breakdown: {
      base_fare: fare.baseFare, distance_fare: fare.distanceFare, time_fare: fare.timeFare,
      surge_multiplier: 1.0, total_fare: fare.totalFare, driver_earnings: fare.driverEarnings, platform_fee: fare.platformFee,
    },
    payment_method,
    payment_intent_id: paymentIntentId,
  }).select().single();
  if (error) throw error;

  return { success: true, ride: row };
}

async function acceptRide(admin, user, { ride_id }) {
  const { data: driverProfile } = await admin
    .from('profiles')
    .select('full_name, driver_vehicle_info, driver_profile_picture, profile_picture')
    .eq('email', user.email)
    .single();

  const { data: activeRides } = await admin
    .from('ride_requests')
    .select('id')
    .eq('driver_email', user.email)
    .in('status', ACTIVE_DRIVER_STATUSES);
  if (activeRides?.length) throw new Error('You already have an active ride in progress');

  const { data: row, error } = await admin
    .from('ride_requests')
    .update({
      driver_status: 'accepted', status: 'en_route', driver_email: user.email,
      driver_name: driverProfile?.full_name || null,
      driver_profile_picture: driverProfile?.driver_profile_picture || driverProfile?.profile_picture || null,
      driver_vehicle_info: driverProfile?.driver_vehicle_info || null,
      matched_at: new Date().toISOString(),
    })
    .eq('id', ride_id)
    .eq('status', 'requested')
    .is('driver_email', null)
    .select()
    .single();
  if (error || !row) throw new Error('This ride is no longer available');

  await notify(admin, row.created_by || row.passenger_email, 'ride_update', '🚗 Driver Assigned!',
    `${row.driver_name || 'Your driver'} is on their way to ${row.pickup_address}.`, ride_id);

  return { success: true, ride: row };
}

async function completeRide(admin, user, { ride_id }) {
  const { data: ride, error: fetchError } = await admin.from('ride_requests').select('*').eq('id', ride_id).single();
  if (fetchError || !ride) throw new Error('Ride not found');
  if (ride.driver_email !== user.email) throw new Error('You are not the driver on this ride');
  if (ride.status === 'completed') return { success: true, ride };
  if (!['accepted', 'en_route', 'arrived'].includes(ride.status)) {
    throw new Error(`Ride cannot be completed from status "${ride.status}"`);
  }

  const driverEarnings = ride.fare_breakdown?.driver_earnings;
  if (!ride.driver_paid && driverEarnings > 0) {
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: null, p_to_email: user.email, p_debit_amount: null, p_credit_amount: driverEarnings,
      p_reference_type: 'ride_fare', p_reference_id: ride_id, p_memo: `Ride from ${ride.pickup_address} to ${ride.dropoff_address}`,
    });
    if (moveError) throw moveError;
  }

  const { data: row, error } = await admin.from('ride_requests').update({
    status: 'completed', end_time: new Date().toISOString(), driver_paid: true,
  }).eq('id', ride_id).select().single();
  if (error) throw error;

  await notify(admin, ride.created_by || ride.passenger_email, 'ride_update', '✅ Ride Completed!',
    `You've arrived at ${ride.dropoff_address}. Total fare: $${(ride.fare_breakdown?.total_fare || 0).toFixed(2)}.`, ride_id);

  return { success: true, ride: row };
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
  if (ride.status !== 'requested' || ride.driver_email) return { matched: false, message: 'Ride is no longer waiting for a driver' };
  if (!ride.pickup_coords) throw new Error('Ride has no pickup location');

  const { data: candidates, error } = await admin
    .from('profiles')
    .select('email, driver_current_lat, driver_current_lng')
    .eq('driver_is_online', true);
  if (error) throw error;

  // Exclude drivers already working another active ride so one driver
  // can't be double-booked onto two rides at once.
  const { data: busyRows } = await admin
    .from('ride_requests')
    .select('driver_email')
    .in('status', ACTIVE_DRIVER_STATUSES)
    .not('driver_email', 'is', null);
  const busyDrivers = new Set((busyRows || []).map((r) => r.driver_email));

  const withDistance = (candidates || [])
    .filter((d) => d.driver_current_lat != null && d.driver_current_lng != null && !busyDrivers.has(d.email))
    .map((d) => ({
      driver_email: d.email,
      distance_miles: haversineMiles(ride.pickup_coords, [d.driver_current_lat, d.driver_current_lng]),
    }))
    .sort((a, b) => a.distance_miles - b.distance_miles);

  const best = withDistance[0];
  if (!best) return { matched: false, message: 'No online drivers available nearby' };

  // Guard against a race with a driver manually accepting (or another
  // auto-match run) between the read above and this write.
  const { data: updated, error: updateError } = await admin
    .from('ride_requests')
    .update({ driver_email: best.driver_email, driver_status: 'assigned', status: 'en_route', matched_at: new Date().toISOString() })
    .eq('id', ride_id)
    .eq('status', 'requested')
    .is('driver_email', null)
    .select()
    .single();
  if (updateError || !updated) return { matched: false, message: 'Ride is no longer waiting for a driver' };

  await notify(admin, ride.created_by || ride.passenger_email, 'ride_update', '🚗 Driver Assigned!',
    `A driver is on their way to ${ride.pickup_address}.`, ride_id);

  return { matched: true, driver_email: best.driver_email, distance_miles: Math.round(best.distance_miles * 10) / 10 };
}

async function rateDriver(admin, user, { ride_id, rating, review }) {
  const { data: ride, error: rideError } = await admin.from('ride_requests').select('*').eq('id', ride_id).single();
  if (rideError || !ride) throw new Error('Ride not found');
  if (ride.passenger_email !== user.email) throw new Error('You are not the passenger on this ride');
  if (!ride.driver_email) throw new Error('This ride has no driver to rate');

  const { error: updateError } = await admin
    .from('ride_requests')
    .update({ passenger_rating: rating, passenger_review: review || null })
    .eq('id', ride_id);
  if (updateError) throw updateError;

  const { data: stats, error: rpcError } = await admin.rpc('rate_driver', {
    p_driver_email: ride.driver_email,
    p_rating: rating,
  });
  if (rpcError) throw rpcError;

  return { success: true, ...stats };
}

async function notify(admin, recipientEmail, type, title, message, referenceId) {
  if (!recipientEmail) return;
  const { error } = await admin.from('notifications').insert({
    recipient_email: recipientEmail, type, title, message, reference_type: 'ride', reference_id: referenceId, read: false,
  });
  if (error) console.error('Failed to create notification:', error);
}
