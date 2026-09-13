// api/extract.js — Structured data extraction from an uploaded file via Claude.
// Used by ExtractDataFromUploadedFile() in src/api/integrations.js.
import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { file_url, json_schema } = req.body;

  if (!file_url || !json_schema) {
    return res.status(400).json({ error: 'file_url and json_schema are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) {
      return res.status(200).json({ status: 'error', details: `Could not download file (${fileRes.status})` });
    }
    const fileText = (await fileRes.text()).slice(0, 20000);

    const systemMessage =
      'You extract structured data from raw file contents (e.g. CSV, JSON, or plain text). ' +
      'Respond ONLY with valid JSON that matches this schema, with no other text or explanation:\n' +
      JSON.stringify(json_schema, null, 2);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemMessage,
        messages: [{ role: 'user', content: fileText }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(200).json({ status: 'error', details: err.error?.message ?? 'Anthropic error' });
    }

    const data = await response.json();
    const result = data.content?.[0]?.text ?? '';
    const cleaned = result.replace(/```json|```/g, '').trim();

    try {
      const output = JSON.parse(cleaned);
      return res.status(200).json({ status: 'success', output });
    } catch {
      return res.status(200).json({ status: 'error', details: 'Model did not return valid JSON' });
    }
  } catch (err) {
    return res.status(200).json({ status: 'error', details: err.message });
  }
}
