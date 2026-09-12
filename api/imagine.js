// api/imagine.js — AI image generation, used by GenerateImage() in
// src/api/integrations.js. Requires OPENAI_API_KEY to be configured; no
// image-generation provider was wired into this project previously, so the
// feature returns a clear "not configured" error until a key is added.
import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { prompt, width = 1024, height = 1024 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: 'Image generation is not configured. Set OPENAI_API_KEY in your environment to enable it.',
    });
  }

  const size = pickSize(width, height);

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size, n: 1 }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data.error?.message ?? 'Image generation failed' });
    }

    const image = data.data?.[0];
    const url = image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null);
    if (!url) return res.status(502).json({ error: 'Image generation returned no image' });

    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function pickSize(width, height) {
  if (width === height) return '1024x1024';
  return width > height ? '1536x1024' : '1024x1536';
}
