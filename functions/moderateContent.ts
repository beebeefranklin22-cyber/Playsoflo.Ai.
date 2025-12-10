import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, contentType, contentId, userEmail } = await req.json();

    if (!content || !contentType || !contentId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use AI to analyze content
    const prompt = `Analyze this ${contentType} content for moderation issues. Check for:
- Spam
- Harassment or bullying
- Inappropriate language
- Hate speech
- Other policy violations

Content: "${content}"

Return JSON with:
{
  "is_violation": boolean,
  "flag_reason": "spam" | "harassment" | "inappropriate" | "hate_speech" | "other" | null,
  "confidence": number (0-100),
  "explanation": "Brief explanation"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          is_violation: { type: "boolean" },
          flag_reason: { type: "string" },
          confidence: { type: "number" },
          explanation: { type: "string" }
        }
      }
    });

    // If violation detected with high confidence, create flag
    if (response.is_violation && response.confidence > 70) {
      await base44.asServiceRole.entities.ModerationFlag.create({
        content_id: contentId,
        content_type: contentType,
        user_email: userEmail,
        flag_reason: response.flag_reason,
        ai_confidence: response.confidence,
        original_content: content,
        status: 'pending'
      });

      // Auto-delete if confidence is very high
      if (response.confidence > 90) {
        if (contentType === 'chat_message') {
          await base44.asServiceRole.entities.LivestreamChat.update(contentId, {
            is_deleted: true
          });
        }
      }

      return Response.json({
        flagged: true,
        confidence: response.confidence,
        reason: response.flag_reason,
        explanation: response.explanation
      });
    }

    return Response.json({
      flagged: false,
      confidence: response.confidence
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});