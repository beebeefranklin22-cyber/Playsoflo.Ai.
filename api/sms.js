// api/sms.js — SMS sending via Twilio
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'to and message are required' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(500).json({ error: 'Twilio env vars not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)' });
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.message ?? 'Twilio error' });
    }

    return res.status(200).json({ success: true, sid: data.sid });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
