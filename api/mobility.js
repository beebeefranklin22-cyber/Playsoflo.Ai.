// Gateway function — combines rides.js and delivery.js. See api/money.js
// for why these are grouped (Vercel Hobby plan's 12-function cap).
import rides from './_handlers/rides.js';
import delivery from './_handlers/delivery.js';

const ROUTES = { rides, delivery };

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
