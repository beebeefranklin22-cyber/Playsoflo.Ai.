import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent, refundPaymentIntent } from './_lib/stripe.js';
import { PLATFORM_FEE_RATES, round2, cleanError } from './_lib/orderHelpers.js';

// Car rental payment completion, pickup/dropoff state, and
// cancellation/refunds. createCarRental (src/functions) already inserts
// the row itself (status "pending_payment") with a best-effort overlap
// check; this endpoint owns everything that happens to it after that.
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
    if (action === 'pay') return res.status(200).json(await payRental(admin, user, req.body));
    if (action === 'confirm_pickup') return res.status(200).json(await confirmPickup(admin, user, req.body));
    if (action === 'confirm_dropoff') return res.status(200).json(await confirmDropoff(admin, user, req.body));
    if (action === 'cancel') return res.status(200).json(await cancelRental(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('car-rental error:', action, err);
    return res.status(200).json({ error: cleanError(err.message) });
  }
}

async function payRental(admin, user, body) {
  const { rental_id, payment_method, saved_payment_method_id, confirm_payment_intent_id } = body;
  const { data: rental, error } = await admin.from('car_rentals').select('*').eq('id', rental_id).single();
  if (error || !rental) throw new Error('Rental not found');
  if (rental.renter_email !== user.email) throw new Error('Only the renter can pay for this rental');
  if (rental.status !== 'pending_payment') throw new Error(`This rental is not awaiting payment (status: ${rental.status})`);

  const feeRate = PLATFORM_FEE_RATES.car_rental;
  const totalAmount = round2(rental.total_amount || 0);
  const platformFee = round2(totalAmount * feeRate);
  const providerEarnings = round2(totalAmount - platformFee);

  let paymentIntentId = null;
  if (payment_method === 'wallet') {
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: user.email, p_to_email: rental.provider_email, p_debit_amount: totalAmount, p_credit_amount: providerEarnings,
      p_reference_type: 'car_rental', p_reference_id: rental_id, p_memo: `${rental.car_make} ${rental.car_model}`,
    });
    if (moveError) {
      if (String(moveError.message).includes('insufficient balance')) throw new Error('Insufficient wallet balance');
      throw moveError;
    }
  } else if (payment_method === 'stripe') {
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
      if (pmError || !pmRow?.stripe_payment_method_id || !pmRow?.stripe_customer_id) throw new Error('Saved payment method not found');
      const intent = await createPaymentIntent({
        amountCents: Math.round(totalAmount * 100), currency: 'usd',
        metadata: { order_type: 'car_rental', customer_email: user.email, provider_email: rental.provider_email },
        customerId: pmRow.stripe_customer_id, paymentMethodId: pmRow.stripe_payment_method_id, offSession: true,
      });
      if (intent.status !== 'succeeded') throw new Error(`This card needs additional verification (status: ${intent.status}). Please use a new card instead.`);
      paymentIntentId = intent.id;
    } else {
      const intent = await createPaymentIntent({
        amountCents: Math.round(totalAmount * 100), currency: 'usd',
        metadata: { order_type: 'car_rental', customer_email: user.email, provider_email: rental.provider_email },
      });
      return {
        needsClientAction: true,
        client_secret: intent.client_secret,
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        payment_intent_id: intent.id,
      };
    }
    const { error: creditError } = await admin.rpc('wallet_move', {
      p_from_email: null, p_to_email: rental.provider_email, p_debit_amount: null, p_credit_amount: providerEarnings,
      p_reference_type: 'car_rental', p_reference_id: paymentIntentId, p_memo: `${rental.car_make} ${rental.car_model}`,
    });
    if (creditError) console.error('Failed to credit provider earnings for', paymentIntentId, creditError);
  } else {
    throw new Error(`Unknown payment_method "${payment_method}"`);
  }

  const { data: row, error: updateError } = await admin.from('car_rentals').update({
    status: 'confirmed', payment_method, payment_intent_id: paymentIntentId, provider_earnings: providerEarnings, platform_fee: platformFee,
  }).eq('id', rental_id).select().single();
  if (updateError) throw updateError;

  await notify(admin, rental.provider_email, 'booking_confirmed', 'Rental Confirmed!',
    `${user.email} paid for their rental of your ${rental.car_make} ${rental.car_model}.`, rental_id);

  return { success: true, rental: row };
}

async function confirmPickup(admin, user, { rental_id, photos, videos, inspection }) {
  const { data: rental, error } = await admin.from('car_rentals').select('*').eq('id', rental_id).single();
  if (error || !rental) throw new Error('Rental not found');
  if (rental.renter_email !== user.email && rental.provider_email !== user.email) throw new Error('You are not part of this rental');
  if (rental.status !== 'confirmed') throw new Error(`Rental is not ready for pickup (status: ${rental.status})`);

  const { data: row, error: updateError } = await admin.from('car_rentals').update({
    status: 'in_progress',
    pickup_confirmed_at: new Date().toISOString(),
    pickup_confirmed_by: user.email,
    pre_rental_photos: photos || [],
    pre_rental_videos: videos || [],
    pre_rental_inspection: inspection || null,
  }).eq('id', rental_id).select().single();
  if (updateError) throw updateError;

  const otherParty = user.email === rental.renter_email ? rental.provider_email : rental.renter_email;
  await notify(admin, otherParty, 'booking_update', 'Rental Pickup Confirmed',
    `Pickup for the ${rental.car_make} ${rental.car_model} rental has been confirmed.`, rental_id);

  return { success: true, rental: row };
}

async function confirmDropoff(admin, user, { rental_id, photos, videos, inspection, photo_comparison, new_damages_detected }) {
  const { data: rental, error } = await admin.from('car_rentals').select('*').eq('id', rental_id).single();
  if (error || !rental) throw new Error('Rental not found');
  if (rental.renter_email !== user.email && rental.provider_email !== user.email) throw new Error('You are not part of this rental');
  if (rental.status !== 'in_progress') throw new Error(`Rental is not in progress (status: ${rental.status})`);

  const { data: row, error: updateError } = await admin.from('car_rentals').update({
    status: 'completed',
    dropoff_confirmed_at: new Date().toISOString(),
    dropoff_confirmed_by: user.email,
    post_rental_photos: photos || [],
    post_rental_videos: videos || [],
    post_rental_inspection: inspection || null,
    photo_comparison: photo_comparison || null,
    new_damages_detected: !!new_damages_detected,
    deposit_status: new_damages_detected ? 'none' : 'not_needed',
  }).eq('id', rental_id).select().single();
  if (updateError) throw updateError;

  const otherParty = user.email === rental.renter_email ? rental.provider_email : rental.renter_email;
  await notify(admin, otherParty, 'booking_update', 'Rental Completed',
    `The ${rental.car_make} ${rental.car_model} rental has been marked complete.${new_damages_detected ? ' New damage was flagged at drop-off.' : ''}`, rental_id);

  return { success: true, rental: row };
}

const CANCELLATION_POLICIES = {
  flexible: (daysUntilStart, total) => (daysUntilStart < 1 ? total : 0),
  moderate: (daysUntilStart, total) => (daysUntilStart < 3 ? total * 0.5 : 0),
  strict: (daysUntilStart, total) => (daysUntilStart < 2 ? total : daysUntilStart < 7 ? total * 0.5 : 0),
  non_refundable: (daysUntilStart, total) => total,
};

async function cancelRental(admin, user, { rental_id, reason }) {
  const { data: rental, error } = await admin.from('car_rentals').select('*').eq('id', rental_id).single();
  if (error || !rental) throw new Error('Rental not found');
  if (rental.renter_email !== user.email && rental.provider_email !== user.email) throw new Error('You are not part of this rental');
  if (!['pending_payment', 'confirmed'].includes(rental.status)) throw new Error(`Rental cannot be cancelled from status "${rental.status}"`);

  let refundAmount = 0;
  if (rental.status === 'confirmed') {
    const policy = CANCELLATION_POLICIES[rental.cancellation_policy] || CANCELLATION_POLICIES.moderate;
    const daysUntilStart = Math.ceil((new Date(rental.start_date) - new Date()) / (1000 * 60 * 60 * 24));
    const fee = round2(policy(daysUntilStart, rental.total_amount || 0));
    refundAmount = round2((rental.total_amount || 0) - fee);

    if (refundAmount > 0) {
      const providerClawback = Math.min(rental.provider_earnings || 0, refundAmount);
      if (providerClawback > 0) {
        const { error: clawbackError } = await admin.rpc('wallet_move', {
          p_from_email: rental.provider_email, p_to_email: null, p_debit_amount: providerClawback, p_credit_amount: null,
          p_reference_type: 'car_rental_refund', p_reference_id: rental_id, p_memo: `Refund for cancelled rental: ${rental.car_make} ${rental.car_model}`,
        });
        if (clawbackError) console.error('Failed to claw back provider earnings for refund:', clawbackError);
      }

      if (rental.payment_method === 'stripe' && rental.payment_intent_id) {
        await refundPaymentIntent({ paymentIntentId: rental.payment_intent_id, amountCents: Math.round(refundAmount * 100) });
      } else if (rental.payment_method === 'wallet') {
        const { error: creditError } = await admin.rpc('wallet_move', {
          p_from_email: null, p_to_email: rental.renter_email, p_debit_amount: null, p_credit_amount: refundAmount,
          p_reference_type: 'car_rental_refund', p_reference_id: rental_id, p_memo: `Refund for cancelled rental: ${rental.car_make} ${rental.car_model}`,
        });
        if (creditError) throw creditError;
      }
    }
  }

  const { error: updateError } = await admin.from('car_rentals').update({
    status: 'cancelled', refund_amount: refundAmount, cancelled_by: user.email, cancellation_reason: reason || null, cancelled_at: new Date().toISOString(),
  }).eq('id', rental_id);
  if (updateError) throw updateError;

  const otherParty = user.email === rental.renter_email ? rental.provider_email : rental.renter_email;
  await notify(admin, otherParty, 'booking_update', 'Rental Cancelled',
    `The rental of ${rental.car_make} ${rental.car_model} was cancelled.${refundAmount > 0 ? ` $${refundAmount.toFixed(2)} refunded.` : ''}`, rental_id);

  return { success: true, refund_amount: refundAmount };
}

async function notify(admin, recipientEmail, type, title, message, referenceId) {
  if (!recipientEmail) return;
  const { error } = await admin.from('notifications').insert({
    recipient_email: recipientEmail, type, title, message, reference_type: 'car_rental', reference_id: referenceId, read: false,
  });
  if (error) console.error('Failed to create notification:', error);
}
