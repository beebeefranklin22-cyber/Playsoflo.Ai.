import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { createSetupIntent } from '../_lib/stripe.js';
import { getOrCreateStripeCustomer } from '../_lib/stripeCustomer.js';

// Creates a Stripe SetupIntent for saving a card without charging it yet,
// attached to the caller's Stripe Customer so the resulting PaymentMethod
// can be reused later for an off-session charge (see api/payment-methods.js
// for the confirm step, and the saved_payment_method_id path in
// api/checkout.js / api/cart-checkout.js for using it at checkout).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });

  try {
    const admin = getSupabaseAdmin();
    const customerId = await getOrCreateStripeCustomer(admin, user);
    const intent = await createSetupIntent({ customerId });
    return res.status(200).json({
      client_secret: intent.client_secret,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    });
  } catch (err) {
    console.error('setup-intent error:', err);
    return res.status(500).json({ error: err.message });
  }
}
