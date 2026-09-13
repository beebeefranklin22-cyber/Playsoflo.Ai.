// Gateway function — combines ai-assist.js, extract.js, imagine.js, and
// ronron.js. See api/money.js for why these are grouped (Vercel Hobby
// plan's 12-function cap).
import aiAssist from './_handlers/ai-assist.js';
import extract from './_handlers/extract.js';
import imagine from './_handlers/imagine.js';
import ronron from './_handlers/ronron.js';

const ROUTES = { 'ai-assist': aiAssist, extract, imagine, ronron };

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
