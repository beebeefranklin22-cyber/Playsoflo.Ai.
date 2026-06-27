export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { prompt, systemPrompt = "You are Ronron AI, the helpful assistant for PlaySoFlo — the World's First Community-Owned Super App.", response_json_schema, model = 'claude-sonnet-4-6' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  try {
    const userContent = response_json_schema
      ? `${prompt}\n\nRespond ONLY with valid JSON matching this schema (no markdown):\n${JSON.stringify(response_json_schema)}`
      : prompt;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 2048, system: systemPrompt, messages: [{ role: 'user', content: userContent }] }),
    });
    const data = await response.json();
    const result = data.content?.[0]?.text ?? '';
    let parsed = null;
    if (response_json_schema) {
      try { parsed = JSON.parse(result.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()); } catch (_) {}
    }
    return res.status(200).json({ result, parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
