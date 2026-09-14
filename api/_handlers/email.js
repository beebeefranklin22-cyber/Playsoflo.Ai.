// api/email.js — Email sending via Resend
import { requireUser } from '../_lib/auth.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { enforceRateLimit } from '../_lib/rateLimit.js';

const MAX_EMAILS_PER_HOUR = 20;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  try {
    await enforceRateLimit(getSupabaseAdmin(), { channel: 'email', userEmail: user.email, maxPerHour: MAX_EMAILS_PER_HOUR });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // Always the platform's own address -- this used to accept an
        // arbitrary `from` directly from the client, letting any signed-in
        // user spoof the sender identity of mail sent through the
        // platform's own Resend domain.
        from: 'PlaySoFlo <noreply@playsoflo.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.message ?? 'Resend error' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
