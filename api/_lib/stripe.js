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

// Stripe-hosted Checkout (a full redirect, unlike createPaymentIntent's
// client-side Elements flow) -- used where the caller wants a `checkout_url`
// to send the browser to rather than embedding a card form, e.g. ad
// campaign funding.
export async function createCheckoutSession({ amountCents, currency = 'usd', productName, successUrl, cancelUrl, metadata = {} }) {
  const body = {
    mode: 'payment',
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][product_data][name]': productName,
    'line_items[0][price_data][unit_amount]': String(amountCents),
    'line_items[0][quantity]': '1',
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...Object.entries(metadata).reduce((acc, [k, v]) => { acc[`metadata[${k}]`] = String(v); return acc; }, {}),
  };

  const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const session = await response.json();
  if (!response.ok) throw new Error(session.error?.message ?? 'Stripe error creating checkout session');
  return session;
}

export async function retrieveCheckoutSession(id) {
  const response = await fetch(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: authHeader() },
  });
  const session = await response.json();
  if (!response.ok) throw new Error(session.error?.message ?? 'Stripe error retrieving checkout session');
  return session;
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

// --- Stripe Connect (real payouts to providers/withdrawing users) ---------
// Express accounts: Stripe hosts identity verification + bank-account
// collection, so this app never touches or stores raw bank details itself.

export async function createExpressAccount({ email, businessName, country = 'US' }) {
  const body = {
    type: 'express',
    email,
    country,
    'capabilities[transfers][requested]': 'true',
    'capabilities[card_payments][requested]': 'true',
    ...(businessName ? { 'business_profile[name]': businessName } : {}),
  };
  const response = await fetch(`${STRIPE_API}/accounts`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const account = await response.json();
  if (!response.ok) throw new Error(account.error?.message ?? 'Stripe error creating connected account');
  return account;
}

export async function createAccountLink({ accountId, refreshUrl, returnUrl }) {
  const response = await fetch(`${STRIPE_API}/account_links`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    }),
  });
  const link = await response.json();
  if (!response.ok) throw new Error(link.error?.message ?? 'Stripe error creating account link');
  return link;
}

// Lets a connected account holder view their own Stripe Express dashboard
// (balance, payout history, update bank details) -- single-use, expires
// quickly, so this is generated fresh on each "Open Dashboard" click.
export async function createLoginLink(accountId) {
  const response = await fetch(`${STRIPE_API}/accounts/${encodeURIComponent(accountId)}/login_links`, {
    method: 'POST',
    headers: { Authorization: authHeader() },
  });
  const link = await response.json();
  if (!response.ok) throw new Error(link.error?.message ?? 'Stripe error creating login link');
  return link;
}

export async function retrieveConnectedAccount(accountId) {
  const response = await fetch(`${STRIPE_API}/accounts/${encodeURIComponent(accountId)}`, {
    headers: { Authorization: authHeader() },
  });
  const account = await response.json();
  if (!response.ok) throw new Error(account.error?.message ?? 'Stripe error retrieving connected account');
  return account;
}

// Moves money from the platform's own Stripe balance into a connected
// account. This is step 1 of a real payout -- step 2 (createConnectPayout)
// is what actually sends it from there to the person's bank.
export async function createConnectTransfer({ amountCents, destinationAccountId, referenceId, description }) {
  const body = {
    amount: String(amountCents),
    currency: 'usd',
    destination: destinationAccountId,
    ...(referenceId ? { transfer_group: referenceId } : {}),
    ...(description ? { description } : {}),
  };
  const response = await fetch(`${STRIPE_API}/transfers`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const transfer = await response.json();
  if (!response.ok) throw new Error(transfer.error?.message ?? 'Stripe error creating transfer');
  return transfer;
}

// Step 2: pays out of a connected account's own Stripe balance (which the
// transfer above just funded) to the bank account they linked during Express
// onboarding. Must be made "as" the connected account via Stripe-Account.
export async function createConnectPayout({ amountCents, destinationAccountId, description }) {
  const response = await fetch(`${STRIPE_API}/payouts`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Account': destinationAccountId,
    },
    body: new URLSearchParams({
      amount: String(amountCents),
      currency: 'usd',
      ...(description ? { description } : {}),
    }),
  });
  const payout = await response.json();
  if (!response.ok) throw new Error(payout.error?.message ?? 'Stripe error creating payout');
  return payout;
}
