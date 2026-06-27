export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { prompt, width = 1024, height = 1024 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
  try {
    const startRes = await fetch('https://api.replicate.com/v1/models/stability-ai/sdxl/predictions', {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json', Prefer: 'wait' },
      body: JSON.stringify({ input: { prompt, width, height, num_outputs: 1 } }),
    });
    const prediction = await startRes.json();
    if (!startRes.ok) throw new Error(prediction.detail ?? 'Replicate error');
    const url = prediction.output?.[0];
    if (!url) throw new Error('No image returned');
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
