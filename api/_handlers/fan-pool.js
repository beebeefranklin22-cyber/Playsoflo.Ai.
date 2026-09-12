import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent } from '../_lib/stripe.js';
import { round2, cleanError } from '../_lib/orderHelpers.js';

// Fan pool contributions. FanPoolManager.jsx used to call a Supabase Edge
// Function (processFanPoolPayment) that doesn't exist anywhere in this
// repo -- every contribution attempt failed outright. This mirrors the
// same wallet/Stripe pattern used by checkout/property-booking/rides.
const PLATFORM_FEE_RATE = 0.05; // matches the "Platform fee (5%)" already shown in the UI

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
    if (action === 'contribute') return res.status(200).json(await contribute(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('fan-pool error:', err);
    return res.status(200).json({ error: cleanError(err.message) });
  }
}

async function contribute(admin, user, body) {
  const { pool_id, tier_name, selected_add_ons, payment_method, saved_payment_method_id, confirm_payment_intent_id } = body;
  const { data: pool, error } = await admin.from('fan_pools').select('*').eq('id', pool_id).single();
  if (error || !pool) throw new Error('Campaign not found');
  if (pool.status !== 'active') throw new Error('This campaign is no longer accepting contributions');

  const tiers = pool.tier_rewards || [];
  const tierIndex = tiers.findIndex((t) => t.tier_name === tier_name);
  if (tierIndex === -1) throw new Error('Tier not found');
  const tier = tiers[tierIndex];
  if (tier.limited_slots > 0 && (tier.slots_taken || 0) >= tier.limited_slots) throw new Error('This tier is sold out');

  const addOns = pool.add_ons || [];
  const addOnIndexes = [];
  let addOnsTotal = 0;
  for (const selected of selected_add_ons || []) {
    const idx = addOns.findIndex((a) => a.id === selected.id);
    if (idx === -1) continue;
    const addOn = addOns[idx];
    if (addOn.quantity_available > 0 && (addOn.quantity_sold || 0) >= addOn.quantity_available) {
      throw new Error(`${addOn.name} is sold out`);
    }
    addOnIndexes.push(idx);
    addOnsTotal += addOn.price || 0;
  }

  // The UI already shows the fan a breakdown of pledge + 5% platform fee
  // added on top (the artist receives the full pledged amount, not a
  // fee-reduced cut) -- match that here rather than silently charging
  // differently from what was displayed.
  const pledge = round2((tier.minimum_contribution || 0) + addOnsTotal);
  const platformFee = round2(pledge * PLATFORM_FEE_RATE);
  const total = round2(pledge + platformFee);
  const artistEarnings = pledge;

  let paymentIntentId = null;
  if (payment_method === 'wallet') {
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: user.email, p_to_email: pool.artist_email, p_debit_amount: total, p_credit_amount: artistEarnings,
      p_reference_type: 'fan_pool', p_reference_id: pool_id, p_memo: pool.title,
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
        amountCents: Math.round(total * 100), currency: 'usd',
        metadata: { order_type: 'fan_pool', customer_email: user.email, provider_email: pool.artist_email },
        customerId: pmRow.stripe_customer_id, paymentMethodId: pmRow.stripe_payment_method_id, offSession: true,
      });
      if (intent.status !== 'succeeded') throw new Error(`This card needs additional verification (status: ${intent.status}). Please use a new card instead.`);
      paymentIntentId = intent.id;
    } else {
      const intent = await createPaymentIntent({
        amountCents: Math.round(total * 100), currency: 'usd',
        metadata: { order_type: 'fan_pool', customer_email: user.email, provider_email: pool.artist_email },
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

  const updatedTiers = [...tiers];
  updatedTiers[tierIndex] = { ...tier, slots_taken: (tier.slots_taken || 0) + 1 };
  const updatedAddOns = [...addOns];
  for (const idx of addOnIndexes) {
    updatedAddOns[idx] = { ...updatedAddOns[idx], quantity_sold: (updatedAddOns[idx].quantity_sold || 0) + 1 };
  }
  const contributors = [...(pool.contributors || []), {
    email: user.email, tier_name, amount: pledge, contributed_at: new Date().toISOString(),
  }];
  const newRaised = round2((pool.raised_amount || 0) + pledge);

  const { data: updatedPool, error: updateError } = await admin.from('fan_pools').update({
    raised_amount: newRaised,
    contributors,
    tier_rewards: updatedTiers,
    add_ons: updatedAddOns,
    status: pool.goal_amount && newRaised >= pool.goal_amount ? 'funded' : pool.status,
  }).eq('id', pool_id).select().single();
  if (updateError) throw updateError;

  await admin.from('notifications').insert({
    recipient_email: pool.artist_email, type: 'fan_pool_contribution', title: 'New Contribution!',
    message: `${user.email} backed "${pool.title}" at the ${tier_name} tier ($${pledge.toFixed(2)}).`,
    reference_type: 'fan_pool', reference_id: pool_id, read: false,
  });

  return { success: true, pool: updatedPool };
}
