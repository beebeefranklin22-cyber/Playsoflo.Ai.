// Creates a Stripe SetupIntent for saving a card without charging it yet
// (e.g. "add a payment method" flows). Uses the same platform Stripe
// account as api/stripe-intent.js — no Stripe Connect needed.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });

  try {
    const credentials = Buffer.from(`${secretKey}:`).toString('base64');
    const response = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'automatic_payment_methods[enabled]': 'true' }),
    });
    const intent = await response.json();
    if (!response.ok) throw new Error(intent.error?.message ?? 'Stripe error');
    return res.status(200).json({
      client_secret: intent.client_secret,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
