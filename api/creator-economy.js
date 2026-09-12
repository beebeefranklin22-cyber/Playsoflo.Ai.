// Gateway function — combines fan-pool.js, music-distribution.js, and
// collaborative-revenue.js. See api/money.js for why these are grouped
// (Vercel Hobby plan's 12-function cap).
import fanPool from './_handlers/fan-pool.js';
import musicDistribution from './_handlers/music-distribution.js';
import collaborativeRevenue from './_handlers/collaborative-revenue.js';

const ROUTES = {
  'fan-pool': fanPool,
  'music-distribution': musicDistribution,
  'collaborative-revenue': collaborativeRevenue,
};

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
