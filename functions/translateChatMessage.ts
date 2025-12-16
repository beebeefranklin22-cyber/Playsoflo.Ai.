import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, targetLanguage, sourceLanguage } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use AI to detect language and translate
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a professional translator specializing in P2P trading communication.

Original message: "${message}"
${sourceLanguage ? `Source language: ${sourceLanguage}` : 'Detect the source language automatically'}
${targetLanguage ? `Target language: ${targetLanguage}` : 'Target language: English'}

Provide:
1. Detected source language
2. Translated message (preserve tone and context for trading)
3. Confidence level in translation

IMPORTANT: For P2P trading, preserve:
- Numbers, amounts, and currency symbols exactly
- Payment method names
- Dates and times
- Technical crypto terms
- Maintain professional and clear tone`,
      response_json_schema: {
        type: "object",
        properties: {
          detected_language: { type: "string", description: "ISO language code (e.g., 'en', 'es', 'zh')" },
          detected_language_name: { type: "string", description: "Language name (e.g., 'English', 'Spanish')" },
          translated_message: { type: "string", description: "Translated text" },
          confidence: { type: "number", description: "Confidence score 0-100" },
          needs_human_review: { type: "boolean", description: "Whether message is complex and needs review" }
        }
      }
    });

    return Response.json({
      success: true,
      original_message: message,
      translation: aiResponse
    });

  } catch (error) {
    console.error('Error translating message:', error);
    return Response.json({ 
      error: error.message || 'Translation failed'
    }, { status: 500 });
  }
});