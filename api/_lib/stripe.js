// Minimal Stripe REST helpers shared by server endpoints that need to
// create/verify PaymentIntents (no Stripe SDK dependency, matching the
// plain-fetch style already used by api/stripe-intent.js).
const STRIPE_API = 'https://api.stripe.com/v1';

function authHeader() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

export async function createPaymentIntent({ amountCents, currency = 'usd', metadata = {} }) {
  const response = await fetch(`${STRIPE_API}/payment_intents`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      amount: String(amountCents),
      currency,
      'automatic_payment_methods[enabled]': 'true',
      ...Object.entries(metadata).reduce((acc, [k, v]) => { acc[`metadata[${k}]`] = String(v); return acc; }, {}),
    }),
  });
  const intent = await response.json();
  if (!response.ok) throw new Error(intent.error?.message ?? 'Stripe error creating payment intent');
  return intent;
}

export async function retrievePaymentIntent(id) {
  const response = await fetch(`${STRIPE_API}/payment_intents/${encodeURIComponent(id)}`, {
    headers: { Authorization: authHeader() },
  });
  const intent = await response.json();
  if (!response.ok) throw new Error(intent.error?.message ?? 'Stripe error retrieving payment intent');
  return intent;
}
