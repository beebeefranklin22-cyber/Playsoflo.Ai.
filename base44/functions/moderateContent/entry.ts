import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, contentType } = await req.json();

    if (!content) {
      return Response.json({ error: 'Content required' }, { status: 400 });
    }

    // Use AI to detect harmful, illegal, or malicious content
    const moderationResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a content moderation AI. Analyze this ${contentType || 'text'} for harmful content.

Content to analyze: "${content}"

Check for:
- Illegal activities (hacking, phishing, fraud, drugs, weapons)
- Harassment, hate speech, or discrimination
- Violence or threats
- Sexual exploitation
- Spam or scams
- Personal information exposure (emails, phones, addresses, passwords)
- Malicious code or instructions
- Copyright violations

Provide detailed analysis.`,
      response_json_schema: {
        type: "object",
        properties: {
          is_safe: { type: "boolean" },
          violations: { 
            type: "array", 
            items: { type: "string" } 
          },
          severity: { 
            type: "string",
            enum: ["none", "low", "medium", "high", "critical"]
          },
          recommendation: { type: "string" },
          explanation: { type: "string" }
        }
      }
    });

    // Log moderation results for admin review
    if (!moderationResult.is_safe) {
      await base44.asServiceRole.entities.ModerationFlag.create({
        user_email: user.email,
        content: content,
        content_type: contentType || 'unknown',
        violations: moderationResult.violations,
        severity: moderationResult.severity,
        auto_flagged: true,
        status: moderationResult.severity === 'critical' ? 'blocked' : 'pending_review'
      });
    }

    return Response.json({
      success: true,
      moderation: moderationResult
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});