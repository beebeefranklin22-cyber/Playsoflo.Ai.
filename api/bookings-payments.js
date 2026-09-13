// Gateway function — combines bookings.js, payment-methods.js, and
// setup-intent.js. See api/money.js for why these are grouped (Vercel
// Hobby plan's 12-function cap).
import bookings from './_handlers/bookings.js';
import paymentMethods from './_handlers/payment-methods.js';
import setupIntent from './_handlers/setup-intent.js';

const ROUTES = {
  bookings,
  'payment-methods': paymentMethods,
  'setup-intent': setupIntent,
};

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
