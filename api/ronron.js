// api/ronron.js — Ronron AI powered by Anthropic Claude
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, systemPrompt, response_json_schema, model } = req.body;

  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const systemMessage = response_json_schema
    ? `${systemPrompt ?? 'You are Ronron AI, the helpful assistant for PlaySoFlo.'}\n\nRespond ONLY with valid JSON that matches this schema:\n${JSON.stringify(response_json_schema, null, 2)}\n\nDo not add any other text or explanation.`
    : (systemPrompt ?? 'You are Ronron AI, the helpful assistant for PlaySoFlo.');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model ?? 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemMessage,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: err.error?.message ?? 'Anthropic error' });
    }

    const data = await response.json();
    const result = data.content?.[0]?.text ?? '';

    // If a JSON schema was requested, try to parse the result
    if (response_json_schema) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.status(200).json({ result, parsed });
      } catch {
        return res.status(200).json({ result, parsed: null });
      }
    }

    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
