// Gateway function — combines ai-assist.js, extract.js, imagine.js,
// ronron.js, tmdb.js, and ticketmaster.js. See api/money.js for why these
// are grouped (Vercel Hobby plan's 12-function cap).
import aiAssist from './_handlers/ai-assist.js';
import extract from './_handlers/extract.js';
import imagine from './_handlers/imagine.js';
import ronron from './_handlers/ronron.js';
import tmdb from './_handlers/tmdb.js';
import ticketmaster from './_handlers/ticketmaster.js';

const ROUTES = { 'ai-assist': aiAssist, extract, imagine, ronron, tmdb, ticketmaster };

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
