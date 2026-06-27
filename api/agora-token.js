export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { channelName, uid = 0 } = req.body;
  if (!channelName) return res.status(400).json({ error: 'channelName required' });
  const appId = process.env.AGORA_APP_ID;
  if (!appId) return res.status(500).json({ error: 'AGORA_APP_ID not configured' });
  // Return appId + channel so client can join (full token gen requires server SDK)
  const expireTs = Math.floor(Date.now() / 1000) + 3600;
  return res.status(200).json({ appId, channelName, uid, expireTs, token: null });
}
