import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      savedExperiences,
      likedPosts,
      watchHistory,
      bookings,
      follows,
      userInterests
    } = await req.json();

    // Use AI to analyze user behavior patterns
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze user behavior and create personalized recommendations:

Saved Experiences: ${JSON.stringify(savedExperiences.slice(0, 10))}
Liked Posts: ${JSON.stringify(likedPosts.slice(0, 10))}
Watch History: ${JSON.stringify(watchHistory.slice(0, 10))}
Bookings: ${JSON.stringify(bookings.slice(0, 10))}
Follows: ${JSON.stringify(follows.slice(0, 10))}
User Interests: ${JSON.stringify(userInterests)}

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