export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { file_url, json_schema } = req.body;
  if (!file_url) return res.status(400).json({ error: 'file_url required' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  try {
    const prompt = json_schema
      ? `Extract data from this file and return ONLY JSON matching this schema. No markdown.\nSchema: ${JSON.stringify(json_schema)}\nFile: ${file_url}`
      : `Extract and summarize all data from this file: ${file_url}`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    let parsed = null;
    if (json_schema) { try { parsed = JSON.parse(text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()); } catch (_) {} }
    return res.status(200).json({ result: text, parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
