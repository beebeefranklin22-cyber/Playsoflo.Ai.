// Gateway function — combines stripe-intent.js and shared.js. See
// api/money.js for why these are grouped (Vercel Hobby plan's 12-function
// cap).
import stripeIntent from './_handlers/stripe-intent.js';
import shared from './_handlers/shared.js';

const ROUTES = { 'stripe-intent': stripeIntent, shared };

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
