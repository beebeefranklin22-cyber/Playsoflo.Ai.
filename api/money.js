// Gateway function — combines checkout.js, cart-checkout.js, wallet.js, and
// food-orders.js into one deployed Serverless Function. Vercel's Hobby plan
// caps a deployment at 12 Functions; this app has 28 API route files, so
// they're grouped into 9 gateway files like this one (see vercel.json's
// rewrites, which map each original /api/<name> URL to the right gateway +
// a `__fn` query param — no client code needed to change).
import checkout from './_handlers/checkout.js';
import cartCheckout from './_handlers/cart-checkout.js';
import wallet from './_handlers/wallet.js';
import foodOrders from './_handlers/food-orders.js';

const ROUTES = {
  checkout,
  'cart-checkout': cartCheckout,
  wallet,
  'food-orders': foodOrders,
};

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
