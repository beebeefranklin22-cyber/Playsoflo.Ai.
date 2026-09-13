// Gateway function — combines email.js, sms.js, and agora-token.js. See
// api/money.js for why these are grouped (Vercel Hobby plan's 12-function
// cap).
import email from './_handlers/email.js';
import sms from './_handlers/sms.js';
import agoraToken from './_handlers/agora-token.js';

const ROUTES = { email, sms, 'agora-token': agoraToken };

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}
