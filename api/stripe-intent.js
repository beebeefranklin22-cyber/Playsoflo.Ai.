import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { amount, currency = 'usd', metadata = {} } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
  try {
    const credentials = Buffer.from(`${secretKey}:`).toString('base64');
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        amount: String(amount), currency,
        'automatic_payment_methods[enabled]': 'true',
        ...Object.entries({ ...metadata, created_by: user.email }).reduce((acc, [k, v]) => { acc[`metadata[${k}]`] = String(v); return acc; }, {}),
      }),
    });
    const intent = await response.json();
    if (!response.ok) throw new Error(intent.error?.message ?? 'Stripe error');
    return res.status(200).json({
      clientSecret: intent.client_secret,
      id: intent.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
