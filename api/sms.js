export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) return res.status(500).json({ error: 'Twilio env vars missing' });
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: message }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'Twilio error');
    return res.status(200).json({ sid: data.sid, status: data.status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
