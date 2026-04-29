import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { campaign_id } = body;

    // Fetch campaign(s) to analyze
    let campaigns = [];
    if (campaign_id) {
      const camp = await base44.asServiceRole.entities.AdCampaign.filter({ id: campaign_id });
      campaigns = camp;
    } else {
      // Analyze all AI-assisted active campaigns owned by this user (or all if admin)
      const filter = user.role === 'admin'
        ? { ai_optimized: true, status: 'active' }
        : { advertiser_email: user.email, ai_optimized: true, status: 'active' };
      campaigns = await base44.asServiceRole.entities.AdCampaign.filter(filter);
    }

    if (!campaigns.length) {
      return Response.json({ message: 'No AI-assisted campaigns to analyze', results: [] });
    }

    const results = [];

    for (const campaign of campaigns) {
      const impressions = campaign.impressions || 0;
      const clicks = campaign.clicks || 0;
      const spend = campaign.spend || 0;
      const budget = campaign.budget_amount || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const budgetUtilization = budget > 0 ? (spend / budget) * 100 : 0;

      // Ask AI to analyze performance and suggest improvements
      const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an expert digital advertising analyst. Analyze this ad campaign's performance and provide specific, actionable suggestions.

Campaign: "${campaign.campaign_name}"
Current Headline: "${campaign.headline || 'None'}"
Description: "${campaign.description || 'None'}"
Objective: ${campaign.objective || 'brand_awareness'}
Call to Action: ${campaign.call_to_action || 'learn_more'}
Placements: ${(campaign.placements || []).join(', ')}

Performance Metrics:
- Impressions: ${impressions.toLocaleString()}
- Clicks: ${clicks.toLocaleString()}
- CTR: ${ctr.toFixed(2)}%
- Spend: $${spend.toFixed(2)}
- Budget: $${budget.toFixed(2)}
- Budget Utilization: ${budgetUtilization.toFixed(1)}%
- CPC: $${cpc.toFixed(2)}

Industry benchmarks:
- Good CTR for social feed: 1.5–3%
- Good CTR for stories: 0.5–1.5%
- Good CTR for banner: 0.1–0.5%

Based on the metrics above:
1. Assess overall performance (excellent/good/fair/poor) with a brief reason
2. Suggest 3 alternative headline variations that could improve CTR (be specific and creative, tailored to the campaign objective)
3. Recommend budget action: increase, decrease, or keep the same — and by what amount/percentage
4. Give 1-2 specific creative tips to improve the ad

Return a JSON object with exactly this structure.`,
        response_json_schema: {
          type: 'object',
          properties: {
            performance_grade: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
            performance_reason: { type: 'string' },
            headline_suggestions: {
              type: 'array',
              items: { type: 'string' },
            },
            budget_action: { type: 'string', enum: ['increase', 'decrease', 'maintain'] },
            budget_change_percent: { type: 'number' },
            budget_reasoning: { type: 'string' },
            creative_tips: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      });

      // Calculate suggested new budget
      let suggested_budget = budget;
      if (analysis.budget_action === 'increase') {
        suggested_budget = budget * (1 + (analysis.budget_change_percent || 20) / 100);
      } else if (analysis.budget_action === 'decrease') {
        suggested_budget = budget * (1 - (analysis.budget_change_percent || 20) / 100);
      }

      // Save suggestions back onto the campaign record
      await base44.asServiceRole.entities.AdCampaign.update(campaign.id, {
        ai_suggestions: {
          analyzed_at: new Date().toISOString(),
          performance_grade: analysis.performance_grade,
          performance_reason: analysis.performance_reason,
          headline_suggestions: analysis.headline_suggestions,
          budget_action: analysis.budget_action,
          budget_change_percent: analysis.budget_change_percent,
          budget_reasoning: analysis.budget_reasoning,
          suggested_budget: Math.round(suggested_budget * 100) / 100,
          creative_tips: analysis.creative_tips,
          current_ctr: parseFloat(ctr.toFixed(2)),
          current_cpc: parseFloat(cpc.toFixed(2)),
        },
      });

      results.push({
        campaign_id: campaign.id,
        campaign_name: campaign.campaign_name,
        analysis,
        current_metrics: { impressions, clicks, ctr: parseFloat(ctr.toFixed(2)), spend, budget, cpc: parseFloat(cpc.toFixed(2)) },
        suggested_budget,
      });
    }

    return Response.json({ success: true, results, analyzed: results.length });
  } catch (error) {
    console.error('Ad performance analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});