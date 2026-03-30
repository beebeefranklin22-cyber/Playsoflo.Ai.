import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, userInterests } = await req.json();

    // Get lightweight interaction counts only
    const [savedCount, likesCount, watchCount] = await Promise.all([
      base44.asServiceRole.entities.Experience.filter({ saved_by: userEmail }).then(r => r.length).catch(() => 0),
      base44.asServiceRole.entities.VideoLike.filter({ user_email: userEmail }).then(r => r.length).catch(() => 0),
      base44.asServiceRole.entities.ContentPurchase.filter({ buyer_email: userEmail }).then(r => r.length).catch(() => 0)
    ]);

    // Use AI to analyze user behavior patterns
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Create personalized recommendations for user:

User Interests: ${JSON.stringify(userInterests)}
Engagement Level: ${savedCount + likesCount + watchCount > 10 ? 'High' : 'Medium'}

Provide JSON with:
- preferredCategories: array of category preferences
- contentTypes: preferred content types
- priceRange: min/max price comfort zone
- timePreferences: when user is most active
- personalityProfile: brief description
- recommendationStrategy: how to personalize their feed

Be concise and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          preferredCategories: { type: "array", items: { type: "string" } },
          contentTypes: { type: "array", items: { type: "string" } },
          priceRange: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" }
            }
          },
          timePreferences: { type: "string" },
          personalityProfile: { type: "string" },
          recommendationStrategy: { type: "string" }
        }
      }
    });

    // Store preferences in user record for quick access
    await base44.asServiceRole.entities.User.update(user.id, {
      ai_preferences: analysis,
      preferences_updated_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      preferences: analysis
    });

  } catch (error) {
    console.error('Preference analysis error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});