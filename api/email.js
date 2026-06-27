export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, subject, body, from = 'PlaySoFlo <noreply@playsoflo.com>' } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body required' });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html: body }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'Resend error');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
