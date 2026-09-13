import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { retrieveSetupIntent, retrievePaymentMethod } from '../_lib/stripe.js';

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
    if (action === 'confirm_card') {
      return res.status(200).json(await handleConfirmCard(admin, user, req.body));
    }
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('payment-methods error:', err);
    return res.status(400).json({ error: err.message || 'Request failed' });
  }
}

// Finalizes "add a card": verifies the SetupIntent actually succeeded
// server-side (never trust the client's word for it), confirms it belongs
// to this user's own Stripe Customer, then persists only safe display
// metadata (brand/last4/expiry) plus the Stripe PaymentMethod reference
// needed to charge it later — never raw card data.
async function handleConfirmCard(admin, user, body) {
  const { setup_intent_id } = body;
  if (!setup_intent_id) throw new Error('setup_intent_id is required');

  const intent = await retrieveSetupIntent(setup_intent_id);
  if (intent.status !== 'succeeded') {
    throw new Error(`Card setup not completed (status: ${intent.status})`);
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('email', user.email)
    .single();
  if (profileError) throw profileError;
  if (!profile?.stripe_customer_id || intent.customer !== profile.stripe_customer_id) {
    throw new Error('This card setup does not belong to your account');
  }

  const pmId = intent.payment_method;
  if (!pmId) throw new Error('No payment method was attached');

  const pm = await retrievePaymentMethod(pmId);
  const card = pm.card || {};

  const { data: existing, error: existingError } = await admin
    .from('payment_methods')
    .select('id')
    .eq('user_email', user.email)
    .eq('status', 'active');
  if (existingError) throw existingError;
  const isDefault = !existing || existing.length === 0;

  const { data: method, error } = await admin
    .from('payment_methods')
    .upsert({
      user_email: user.email,
      type: 'card',
      status: 'active',
      is_default: isDefault,
      stripe_customer_id: profile.stripe_customer_id,
      stripe_payment_method_id: pmId,
      card_details: {
        brand: card.brand || null,
        last4: card.last4 || null,
        exp_month: card.exp_month || null,
        exp_year: card.exp_year || null,
      },
    }, { onConflict: 'user_email,stripe_payment_method_id' })
    .select()
    .single();
  if (error) throw error;

  return { success: true, method };
}
