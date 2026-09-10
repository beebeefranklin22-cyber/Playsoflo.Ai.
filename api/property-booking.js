import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent, refundPaymentIntent } from './_lib/stripe.js';
import { PLATFORM_FEE_RATES, round2, cleanError } from './_lib/orderHelpers.js';

// Real Estate Hub short-term-rental booking flow.
//
// Model: a "request to book" (default) property holds its dates as soon as
// a request is created (status pending_review) but isn't charged until the
// host approves (status approved_awaiting_payment -> guest pays -> status
// confirmed). An `instant_book` property skips the approval step and
// charges immediately at request time. Either way, no two active bookings
// (pending_review / approved_awaiting_payment / confirmed) for the same
// property can have overlapping dates — enforced by a Postgres exclusion
// constraint (property_bookings_no_overlap), not just app-level checks, so
// a race between two simultaneous requests can never double-book. Because
// that constraint also covers pending_review, only one active request can
// exist per date range at a time (simpler and safer than juggling several
// competing pending requests for the same dates).
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
    if (action === 'request') return res.status(200).json(await handleRequest(admin, user, req.body));
    if (action === 'approve') return res.status(200).json(await handleApprove(admin, user, req.body));
    if (action === 'decline') return res.status(200).json(await handleDecline(admin, user, req.body));
    if (action === 'pay') return res.status(200).json(await handlePay(admin, user, req.body));
    if (action === 'cancel') return res.status(200).json(await handleCancel(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('property-booking error:', err);
    if (err.code === '23P01') {
      return res.status(409).json({ error: 'Those dates are no longer available for this property.' });
    }
    return res.status(400).json({ error: cleanError(err.message) });
  }
}

function nightsBetween(checkIn, checkOut) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  return Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
}

async function priceBooking(admin, propertyId, checkInDate, checkOutDate) {
  const { data: property, error } = await admin.from('properties').select('*').eq('id', propertyId).single();
  if (error || !property) throw new Error('Property not found');
  if (!property.host_email) throw new Error('This property has no host on file');

  const nights = nightsBetween(checkInDate, checkOutDate);
  if (nights < 1) throw new Error('Check-out date must be after check-in date');
  if (property.minimum_stay && nights < property.minimum_stay) {
    throw new Error(`Minimum stay is ${property.minimum_stay} night${property.minimum_stay > 1 ? 's' : ''}`);
  }
  if (!property.price_per_night || property.price_per_night <= 0) {
    throw new Error('This property is not available for nightly booking');
  }

  const feeRate = PLATFORM_FEE_RATES.property_booking;
  const subtotal = round2(property.price_per_night * nights);
  const platformFee = round2(subtotal * feeRate);
  const hostEarnings = round2(subtotal - platformFee);
  const totalAmount = round2(subtotal + platformFee);

  return { property, nights, subtotal, platformFee, hostEarnings, totalAmount, feeRate };
}

// Wallet: charges/credits synchronously. Stripe with no saved/confirm id:
// returns { needsClientAction: true, ... } for the caller to relay to the
// client. Stripe with a saved method or a confirm id: charges/credits
// synchronously too.
async function chargePayment(admin, { paymentMethod, savedPaymentMethodId, confirmPaymentIntentId, userEmail, hostEmail, totalAmount, hostEarnings, referenceType, referenceId, memo }) {
  if (paymentMethod === 'wallet') {
    const { error } = await admin.rpc('wallet_move', {
      p_from_email: userEmail, p_to_email: hostEmail, p_debit_amount: totalAmount, p_credit_amount: hostEarnings,
      p_reference_type: referenceType, p_reference_id: referenceId, p_memo: memo,
    });
    if (error) throw error;
    return { paid: true, paymentIntentId: null };
  }

  if (paymentMethod === 'stripe') {
    if (confirmPaymentIntentId) {
      const intent = await retrievePaymentIntent(confirmPaymentIntentId);
      if (intent.status !== 'succeeded') throw new Error(`Payment not completed (status: ${intent.status})`);
      const { error } = await admin.rpc('wallet_move', {
        p_from_email: null, p_to_email: hostEmail, p_debit_amount: null, p_credit_amount: hostEarnings,
        p_reference_type: referenceType, p_reference_id: intent.id, p_memo: memo,
      });
      if (error) console.error('Failed to credit host earnings for', intent.id, error);
      return { paid: true, paymentIntentId: intent.id };
    }

    if (savedPaymentMethodId) {
      const { data: pmRow, error: pmError } = await admin
        .from('payment_methods')
        .select('stripe_customer_id, stripe_payment_method_id')
        .eq('id', savedPaymentMethodId)
        .eq('user_email', userEmail)
        .eq('status', 'active')
        .single();
      if (pmError || !pmRow?.stripe_payment_method_id || !pmRow?.stripe_customer_id) {
        throw new Error('Saved payment method not found');
      }
      const intent = await createPaymentIntent({
        amountCents: Math.round(totalAmount * 100), currency: 'usd',
        metadata: { order_type: referenceType, customer_email: userEmail, provider_email: hostEmail },
        customerId: pmRow.stripe_customer_id, paymentMethodId: pmRow.stripe_payment_method_id, offSession: true,
      });
      if (intent.status !== 'succeeded') {
        throw new Error(`This card needs additional verification (status: ${intent.status}). Please use a new card instead.`);
      }
      const { error } = await admin.rpc('wallet_move', {
        p_from_email: null, p_to_email: hostEmail, p_debit_amount: null, p_credit_amount: hostEarnings,
        p_reference_type: referenceType, p_reference_id: intent.id, p_memo: memo,
      });
      if (error) console.error('Failed to credit host earnings for', intent.id, error);
      return { paid: true, paymentIntentId: intent.id };
    }

    const intent = await createPaymentIntent({
      amountCents: Math.round(totalAmount * 100), currency: 'usd',
      metadata: { order_type: referenceType, customer_email: userEmail, provider_email: hostEmail },
    });
    return {
      needsClientAction: true,
      client_secret: intent.client_secret,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      payment_intent_id: intent.id,
    };
  }

  throw new Error(`Unknown payment_method "${paymentMethod}"`);
}

async function reversePayment(admin, { paymentMethod, paymentIntentId, userEmail, hostEmail, totalAmount, hostEarnings }) {
  if (paymentMethod === 'wallet') {
    const { error } = await admin.rpc('wallet_move', {
      p_from_email: hostEmail, p_to_email: userEmail, p_debit_amount: hostEarnings, p_credit_amount: totalAmount,
      p_reference_type: 'property_booking_reversal', p_reference_id: null, p_memo: 'Booking dates no longer available',
    });
    if (error) console.error('Failed to reverse wallet payment after overlap conflict:', error);
    return;
  }
  if (paymentMethod === 'stripe' && paymentIntentId) {
    try {
      await refundPaymentIntent({ paymentIntentId });
    } catch (err) {
      console.error('Failed to refund Stripe payment after overlap conflict:', err);
    }
    const { error } = await admin.rpc('wallet_move', {
      p_from_email: hostEmail, p_to_email: null, p_debit_amount: hostEarnings, p_credit_amount: null,
      p_reference_type: 'property_booking_reversal', p_reference_id: paymentIntentId, p_memo: 'Booking dates no longer available',
    });
    if (error) console.error('Failed to claw back host earnings after overlap conflict:', error);
  }
}

async function handleRequest(admin, user, body) {
  const { property_id, check_in_date, check_out_date, number_of_guests, special_requests, payment_method, confirm_payment_intent_id, saved_payment_method_id } = body;
  if (!property_id || !check_in_date || !check_out_date) throw new Error('property_id, check_in_date, and check_out_date are required');

  const { property, hostEarnings, platformFee, totalAmount } = await priceBooking(admin, property_id, check_in_date, check_out_date);
  if (user.email === property.host_email) throw new Error("You can't book your own property");

  const { data: guestProfile } = await admin.from('profiles').select('full_name').eq('email', user.email).single();

  const insertRow = (extra) => admin.from('property_bookings').insert({
    property_id, property_title: property.title, guest_email: user.email, guest_name: guestProfile?.full_name || null,
    host_email: property.host_email, check_in_date, check_out_date, number_of_guests: number_of_guests || 1,
    special_requests: special_requests || null, total_price: totalAmount, platform_fee: platformFee, host_earnings: hostEarnings,
    ...extra,
  }).select().single();

  if (!property.instant_book) {
    const { data: row, error } = await insertRow({ status: 'pending_review' });
    if (error) throw error;
    await notify(admin, property.host_email, 'booking_request', 'New Booking Request',
      `${guestProfile?.full_name || user.email} requested to book ${property.title}`, row.id);
    return { success: true, booking: row };
  }

  // Instant book: charge now, then insert as confirmed.
  const payment = await chargePayment(admin, {
    paymentMethod: payment_method, savedPaymentMethodId: saved_payment_method_id, confirmPaymentIntentId: confirm_payment_intent_id,
    userEmail: user.email, hostEmail: property.host_email, totalAmount, hostEarnings,
    referenceType: 'property_booking', referenceId: property_id, memo: property.title,
  });
  if (payment.needsClientAction) return payment;

  try {
    const { data: row, error } = await insertRow({ status: 'confirmed', payment_method: payment_method, payment_intent_id: payment.paymentIntentId });
    if (error) throw error;
    await notify(admin, property.host_email, 'booking_confirmed', 'Booking Confirmed!',
      `${guestProfile?.full_name || user.email} booked ${property.title} (instant book)`, row.id);
    return { success: true, booking: row };
  } catch (err) {
    if (err.code === '23P01') {
      await reversePayment(admin, { paymentMethod: payment_method, paymentIntentId: payment.paymentIntentId, userEmail: user.email, hostEmail: property.host_email, totalAmount, hostEarnings });
    }
    throw err;
  }
}

async function handleApprove(admin, user, body) {
  const { booking_id } = body;
  const { data: booking, error } = await admin.from('property_bookings').select('*').eq('id', booking_id).single();
  if (error || !booking) throw new Error('Booking not found');
  if (booking.host_email !== user.email) throw new Error('Only the host can approve this booking');
  if (booking.status !== 'pending_review') throw new Error(`Booking is already ${booking.status}`);

  const { error: updateError } = await admin.from('property_bookings').update({ status: 'approved_awaiting_payment' }).eq('id', booking_id);
  if (updateError) throw updateError;

  await notify(admin, booking.guest_email, 'booking_update', 'Booking Approved — Payment Needed',
    `${booking.property_title} is approved! Complete payment to confirm your stay.`, booking_id);
  return { success: true };
}

async function handleDecline(admin, user, body) {
  const { booking_id, reason } = body;
  const { data: booking, error } = await admin.from('property_bookings').select('*').eq('id', booking_id).single();
  if (error || !booking) throw new Error('Booking not found');
  if (booking.host_email !== user.email) throw new Error('Only the host can decline this booking');
  if (!['pending_review', 'approved_awaiting_payment'].includes(booking.status)) throw new Error(`Booking is already ${booking.status}`);

  const { error: updateError } = await admin.from('property_bookings').update({
    status: 'declined', cancelled_by: user.email, cancellation_reason: reason || null, cancelled_at: new Date().toISOString(),
  }).eq('id', booking_id);
  if (updateError) throw updateError;

  await notify(admin, booking.guest_email, 'booking_update', 'Booking Not Approved',
    `Your request for ${booking.property_title} was declined.${reason ? ` Reason: ${reason}` : ''}`, booking_id);
  return { success: true };
}

async function handlePay(admin, user, body) {
  const { booking_id, payment_method, confirm_payment_intent_id, saved_payment_method_id } = body;
  const { data: booking, error } = await admin.from('property_bookings').select('*').eq('id', booking_id).single();
  if (error || !booking) throw new Error('Booking not found');
  if (booking.guest_email !== user.email) throw new Error('Only the guest can pay for this booking');
  if (booking.status !== 'approved_awaiting_payment') throw new Error(`This booking is not awaiting payment (status: ${booking.status})`);

  const payment = await chargePayment(admin, {
    paymentMethod: payment_method, savedPaymentMethodId: saved_payment_method_id, confirmPaymentIntentId: confirm_payment_intent_id,
    userEmail: user.email, hostEmail: booking.host_email, totalAmount: booking.total_price, hostEarnings: booking.host_earnings,
    referenceType: 'property_booking', referenceId: booking.property_id, memo: booking.property_title,
  });
  if (payment.needsClientAction) return payment;

  try {
    const { error: updateError } = await admin.from('property_bookings').update({
      status: 'confirmed', payment_method, payment_intent_id: payment.paymentIntentId,
    }).eq('id', booking_id);
    if (updateError) throw updateError;
  } catch (err) {
    if (err.code === '23P01') {
      await reversePayment(admin, { paymentMethod: payment_method, paymentIntentId: payment.paymentIntentId, userEmail: user.email, hostEmail: booking.host_email, totalAmount: booking.total_price, hostEarnings: booking.host_earnings });
    }
    throw err;
  }

  await notify(admin, booking.host_email, 'booking_confirmed', 'Booking Confirmed!',
    `${booking.guest_name || booking.guest_email} paid for their stay at ${booking.property_title}`, booking_id);
  return { success: true };
}

const CANCELLATION_POLICIES = {
  flexible: (daysUntilCheckIn, total) => (daysUntilCheckIn < 1 ? total : 0),
  moderate: (daysUntilCheckIn, total) => (daysUntilCheckIn < 5 ? total * 0.5 : 0),
  strict: (daysUntilCheckIn, total) => (daysUntilCheckIn < 2 ? total : daysUntilCheckIn < 7 ? total * 0.5 : 0),
  non_refundable: (daysUntilCheckIn, total) => total,
};

async function handleCancel(admin, user, body) {
  const { booking_id, reason } = body;
  const { data: booking, error } = await admin.from('property_bookings').select('*').eq('id', booking_id).single();
  if (error || !booking) throw new Error('Booking not found');
  if (booking.guest_email !== user.email && booking.host_email !== user.email) throw new Error('You are not part of this booking');
  if (!['pending_review', 'approved_awaiting_payment', 'confirmed'].includes(booking.status)) throw new Error(`Booking is already ${booking.status}`);

  let refundAmount = 0;
  if (booking.status === 'confirmed') {
    const { data: property } = await admin.from('properties').select('cancellation_policy').eq('id', booking.property_id).single();
    const policy = CANCELLATION_POLICIES[property?.cancellation_policy] || CANCELLATION_POLICIES.moderate;
    const daysUntilCheckIn = Math.ceil((new Date(booking.check_in_date) - new Date()) / (1000 * 60 * 60 * 24));
    const fee = round2(policy(daysUntilCheckIn, booking.total_price || 0));
    refundAmount = round2((booking.total_price || 0) - fee);

    if (refundAmount > 0) {
      const hostClawback = Math.min(booking.host_earnings || 0, refundAmount);
      if (hostClawback > 0) {
        const { error: clawbackError } = await admin.rpc('wallet_move', {
          p_from_email: booking.host_email, p_to_email: null, p_debit_amount: hostClawback, p_credit_amount: null,
          p_reference_type: 'property_booking_refund', p_reference_id: booking_id, p_memo: `Refund for cancelled booking: ${booking.property_title}`,
        });
        if (clawbackError) console.error('Failed to claw back host earnings for refund:', clawbackError);
      }

      if (booking.payment_method === 'stripe' && booking.payment_intent_id) {
        await refundPaymentIntent({ paymentIntentId: booking.payment_intent_id, amountCents: Math.round(refundAmount * 100) });
      } else {
        const { error: creditError } = await admin.rpc('wallet_move', {
          p_from_email: null, p_to_email: booking.guest_email, p_debit_amount: null, p_credit_amount: refundAmount,
          p_reference_type: 'property_booking_refund', p_reference_id: booking_id, p_memo: `Refund for cancelled booking: ${booking.property_title}`,
        });
        if (creditError) throw creditError;
      }
    }
  }

  const { error: updateError } = await admin.from('property_bookings').update({
    status: 'cancelled', refund_amount: refundAmount, cancelled_by: user.email, cancellation_reason: reason || null, cancelled_at: new Date().toISOString(),
  }).eq('id', booking_id);
  if (updateError) throw updateError;

  const otherParty = user.email === booking.guest_email ? booking.host_email : booking.guest_email;
  await notify(admin, otherParty, 'booking_update', 'Booking Cancelled',
    `The booking for ${booking.property_title} was cancelled.${refundAmount > 0 ? ` $${refundAmount.toFixed(2)} refunded.` : ''}`, booking_id);
  return { success: true, refund_amount: refundAmount };
}

async function notify(admin, recipientEmail, type, title, message, referenceId) {
  const { error } = await admin.from('notifications').insert({
    recipient_email: recipientEmail, type, title, message, reference_type: 'property_booking', reference_id: referenceId, read: false,
  });
  if (error) console.error('Failed to create notification:', error);
}
