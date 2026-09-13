// Minimal Stripe REST helpers shared by server endpoints that need to
// create/verify PaymentIntents (no Stripe SDK dependency, matching the
// plain-fetch style already used by api/stripe-intent.js).
const STRIPE_API = 'https://api.stripe.com/v1';

function authHeader() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

// customerId + paymentMethodId together charge a previously-saved card
// off-session (confirmed immediately, no client-side Stripe Elements round
// trip needed) instead of starting a fresh "enter your card" flow.
export async function createPaymentIntent({ amountCents, currency = 'usd', metadata = {}, customerId, paymentMethodId, offSession }) {
  const body = {
    amount: String(amountCents),
    currency,
    ...Object.entries(metadata).reduce((acc, [k, v]) => { acc[`metadata[${k}]`] = String(v); return acc; }, {}),
  };
  if (paymentMethodId) {
    body.customer = customerId;
    body.payment_method = paymentMethodId;
    body.confirm = 'true';
    if (offSession) body.off_session = 'true';
  } else {
    body['automatic_payment_methods[enabled]'] = 'true';
  }

  const response = await fetch(`${STRIPE_API}/payment_intents`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
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

export async function createCustomer({ email, name }) {
  const response = await fetch(`${STRIPE_API}/customers`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, ...(name ? { name } : {}) }),
  });
  const customer = await response.json();
  if (!response.ok) throw new Error(customer.error?.message ?? 'Stripe error creating customer');
  return customer;
}

export async function createSetupIntent({ customerId }) {
  const response = await fetch(`${STRIPE_API}/setup_intents`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ customer: customerId, 'automatic_payment_methods[enabled]': 'true' }),
  });
  const intent = await response.json();
  if (!response.ok) throw new Error(intent.error?.message ?? 'Stripe error creating setup intent');
  return intent;
}

export async function retrieveSetupIntent(id) {
  const response = await fetch(`${STRIPE_API}/setup_intents/${encodeURIComponent(id)}`, {
    headers: { Authorization: authHeader() },
  });
  const intent = await response.json();
  if (!response.ok) throw new Error(intent.error?.message ?? 'Stripe error retrieving setup intent');
  return intent;
}

export async function retrievePaymentMethod(id) {
  const response = await fetch(`${STRIPE_API}/payment_methods/${encodeURIComponent(id)}`, {
    headers: { Authorization: authHeader() },
  });
  const pm = await response.json();
  if (!response.ok) throw new Error(pm.error?.message ?? 'Stripe error retrieving payment method');
  return pm;
}

// Used for cancellation refunds (e.g. property bookings paid by card).
// amountCents omitted refunds the full charge.
export async function refundPaymentIntent({ paymentIntentId, amountCents }) {
  const body = { payment_intent: paymentIntentId };
  if (amountCents != null) body.amount = String(amountCents);
  const response = await fetch(`${STRIPE_API}/refunds`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const refund = await response.json();
  if (!response.ok) throw new Error(refund.error?.message ?? 'Stripe error creating refund');
  return refund;
}
