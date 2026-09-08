// Creates a Stripe PaymentIntent for a generic dollar-amount charge (wallet
// deposits, tips, etc). `amount` is in dollars, matching how the rest of the
// app displays and computes totals; this converts to cents for Stripe.
export async function processStripePayment({ amount, description, metadata } = {}) {
  try {
    const res = await fetch('/api/stripe-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100),
        currency: 'usd',
        metadata: { description: description ?? '', ...metadata },
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { data: { error: data.error ?? 'Payment initialization failed' } };
    }
    return {
      data: {
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        paymentIntentId: data.id,
      },
    };
  } catch (error) {
    console.error('processStripePayment error:', error);
    return { data: { error: error.message } };
  }
}
