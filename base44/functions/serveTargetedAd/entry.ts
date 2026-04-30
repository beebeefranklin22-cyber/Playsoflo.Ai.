import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { position = 'feed', exclude_ids = [] } = await req.json();

    // Fetch all active campaigns
    const allCampaigns = await base44.asServiceRole.entities.AdCampaign.filter({ status: 'active' });

    // Filter by placement and budget
    const eligible = allCampaigns.filter(c => {
      if (!c.placements?.includes(position)) return false;
      if (exclude_ids.includes(c.id)) return false;
      if (c.budget_type === 'lifetime' && (c.spend || 0) >= (c.budget_amount || 0)) return false;
      // Check schedule
      const now = new Date();
      if (c.schedule?.start_date && new Date(c.schedule.start_date) > now) return false;
      if (c.schedule?.end_date && new Date(c.schedule.end_date) < now) return false;
      return true;
    });

    if (eligible.length === 0) {
      return Response.json({ ad: null });
    }

    // Build user profile context for AI matching
    const userProfile = {
      age: user.age || null,
      gender: user.gender || null,
      city: user.city || null,
      interests: user.interests || [],
      role: user.role || 'user',
      account_age_days: user.created_date
        ? Math.floor((Date.now() - new Date(user.created_date).getTime()) / 86400000)
        : null,
    };

    // Build campaign summaries for AI
    const campaignSummaries = eligible.map(c => ({
      id: c.id,
      campaign_name: c.campaign_name,
      headline: c.headline || '',
      description: c.description || '',
      objective: c.objective || '',
      targeting: c.targeting || {},
      placements: c.placements || [],
      budget_amount: c.budget_amount || 0,
      spend: c.spend || 0,
      impressions: c.impressions || 0,
      clicks: c.clicks || 0,
      ctr: c.ctr || 0,
      ai_audience_score: c.ai_audience_score || null,
      ai_optimized: c.ai_optimized || false,
    }));

    // Use AI to score and rank campaigns for this user
    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an ad targeting engine. Given a user profile and a list of ad campaigns, rank the campaigns from best to worst match for this specific user. Consider the user's demographics, interests, city, account age, and the campaign's objective, targeting settings, and past performance (CTR).

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

AD CAMPAIGNS:
${JSON.stringify(campaignSummaries, null, 2)}

Return a JSON ranking with a score (0-100) and brief reason for each campaign. Higher score = better match. Penalize campaigns with no targeting data (treat as generic). Boost campaigns that closely match user interests/city. Also factor in CTR — higher performing ads should score higher.`,
      response_json_schema: {
        type: 'object',
        properties: {
          rankings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                score: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Build score map from AI result
    const scoreMap = {};
    if (aiResult?.rankings) {
      for (const r of aiResult.rankings) {
        scoreMap[r.id] = r.score;
      }
    }

    // Merge AI scores with fallback heuristic scores
    const scored = eligible.map(c => {
      let score = scoreMap[c.id] ?? 50;

      // Additional heuristics on top of AI score
      // Performance boost
      if ((c.impressions || 0) > 100) {
        score += Math.min((c.ctr || 0) * 2, 10);
      }

      // Budget priority (higher budget = slight boost)
      score += Math.min((c.budget_amount || 0) / 50, 5);

      // AI-optimized campaigns get a boost
      if (c.ai_optimized) score += 5;

      return { campaign: c, score };
    });

    // Sort descending
    scored.sort((a, b) => b.score - a.score);

    // Weighted random from top 3 to add variety
    const top = scored.slice(0, 3);
    const totalScore = top.reduce((s, c) => s + c.score, 0);
    const rand = Math.random() * totalScore;
    let cumulative = 0;
    let selected = top[0].campaign;
    for (const { campaign, score } of top) {
      cumulative += score;
      if (rand <= cumulative) {
        selected = campaign;
        break;
      }
    }

    return Response.json({
      ad: selected,
      targeting_score: scored.find(s => s.campaign.id === selected.id)?.score ?? null
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});