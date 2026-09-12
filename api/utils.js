// Gateway function — combines geo.js, prices.js, account.js, and
// diagnostics.js. See api/money.js for why these are grouped (Vercel
// Hobby plan's 12-function cap).
import geo from './_handlers/geo.js';
import prices from './_handlers/prices.js';
import account from './_handlers/account.js';
import diagnostics from './_handlers/diagnostics.js';

const ROUTES = { geo, prices, account, diagnostics };

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
