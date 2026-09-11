import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent } from './_lib/stripe.js';
import { round2, cleanError } from './_lib/orderHelpers.js';

// There's no real integration with any external distributor (DistroKid/
// TuneCore/CD Baby have no self-serve partner API a platform like this can
// call) -- so this can't actually push a track live on Spotify etc. What it
// CAN do honestly: charge the disclosed fee for real and record the
// request as pending fulfillment, rather than the previous behavior of
// fabricating a fake "live" status with made-up ISRC/UPC codes and
// platform links.
const DISTRIBUTOR_FEES = { distrokid: 22.99, tunecore: 9.99, cdbaby: 9.95 };
const SERVICE_FEE = 2.22;

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
    if (action === 'request') return res.status(200).json(await requestDistribution(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('music-distribution error:', err);
    return res.status(200).json({ error: cleanError(err.message) });
  }
}

async function requestDistribution(admin, user, body) {
  const { track_id, platforms, distributor, release_date, payment_method, saved_payment_method_id, confirm_payment_intent_id } = body;
  if (!track_id || !platforms?.length || !distributor) throw new Error('track_id, platforms, and distributor are required');
  if (!DISTRIBUTOR_FEES[distributor]) throw new Error(`Unknown distributor "${distributor}"`);

  const { data: track, error: trackError } = await admin.from('music_tracks').select('*').eq('id', track_id).single();
  if (trackError || !track) throw new Error('Track not found');
  if (track.artist_email !== user.email) throw new Error('Only the track owner can request distribution');

  const distributorFee = DISTRIBUTOR_FEES[distributor];
  const totalFee = round2(distributorFee + SERVICE_FEE);

  let paymentIntentId = null;
  if (payment_method === 'wallet') {
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: user.email, p_to_email: null, p_debit_amount: totalFee, p_credit_amount: null,
      p_reference_type: 'music_distribution', p_reference_id: track_id, p_memo: `Distribution: ${track.title}`,
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
        amountCents: Math.round(totalFee * 100), currency: 'usd',
        metadata: { order_type: 'music_distribution', customer_email: user.email },
        customerId: pmRow.stripe_customer_id, paymentMethodId: pmRow.stripe_payment_method_id, offSession: true,
      });
      if (intent.status !== 'succeeded') throw new Error(`This card needs additional verification (status: ${intent.status}). Please use a new card instead.`);
      paymentIntentId = intent.id;
    } else {
      const intent = await createPaymentIntent({
        amountCents: Math.round(totalFee * 100), currency: 'usd',
        metadata: { order_type: 'music_distribution', customer_email: user.email },
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

  const { data: row, error } = await admin.from('music_distributions').insert({
    artist_email: user.email,
    track_id,
    track_title: track.title,
    platforms,
    distributor,
    distribution_fee: totalFee,
    payment_method,
    payment_intent_id: paymentIntentId,
    release_date: release_date || null,
    status: 'pending_fulfillment',
  }).select().single();
  if (error) throw error;

  return { success: true, distribution: row };
}
