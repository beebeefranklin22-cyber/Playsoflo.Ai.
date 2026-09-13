// Shared helper for server endpoints that ask Claude for a structured
// JSON response, following the same schema-in-system-prompt pattern as
// api/ronron.js and api/extract.js.
export async function askClaudeForJson({ systemPrompt, prompt, model }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model ?? 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `${systemPrompt}\n\nRespond ONLY with valid JSON, no other text or explanation.`,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? 'Anthropic error');
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
