import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { position = 'feed', exclude_ids = [] } = await req.json();

    // Get all active campaigns
    const campaigns = await base44.asServiceRole.entities.AdCampaign.filter({ 
      status: 'active' 
    });

    // Filter campaigns that haven't exceeded budget
    const activeCampaigns = campaigns.filter(campaign => {
      if (campaign.budget_type === 'lifetime') {
        return campaign.spend < campaign.budget_amount;
      }
      // For daily budget, check if they're within daily limit
      return campaign.spend < (campaign.budget_amount * 30); // Rough monthly estimate
    });

    // Score each campaign for this user
    const scoredCampaigns = activeCampaigns.map(campaign => {
      let score = 100;

      // Placement match
      if (!campaign.placements?.includes(position)) {
        return null;
      }

      // Already shown to user
      if (exclude_ids.includes(campaign.id)) {
        score -= 50;
      }

      const targeting = campaign.targeting || {};

      // Age targeting
      if (user.age) {
        const ageMin = targeting.age_min || 0;
        const ageMax = targeting.age_max || 100;
        if (user.age < ageMin || user.age > ageMax) {
          return null;
        }
        // Perfect age match bonus
        const midAge = (ageMin + ageMax) / 2;
        const ageDiff = Math.abs(user.age - midAge);
        score += Math.max(0, 20 - ageDiff);
      }

      // Gender targeting
      if (targeting.genders?.length && !targeting.genders.includes('all')) {
        if (!user.gender || !targeting.genders.includes(user.gender)) {
          return null;
        }
        score += 15;
      }

      // Location targeting
      if (targeting.locations?.length) {
        const userLocation = (user.address || user.city || '').toLowerCase();
        const locationMatch = targeting.locations.some(loc => 
          userLocation.includes(loc.toLowerCase())
        );
        if (!locationMatch) {
          score -= 30;
        } else {
          score += 25;
        }
      }

      // Interest targeting
      if (targeting.interests?.length && user.interests?.length) {
        const interestMatches = targeting.interests.filter(interest =>
          user.interests.some(userInterest =>
            userInterest.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(userInterest.toLowerCase())
          )
        ).length;
        
        if (interestMatches === 0) {
          score -= 20;
        } else {
          score += interestMatches * 10;
        }
      }

      // Performance-based scoring (CTR boost)
      if (campaign.impressions > 100) {
        const ctr = campaign.ctr || 0;
        score += ctr * 5; // Higher CTR = better placement
      }

      // Budget optimization - prioritize campaigns with higher budgets
      const budgetBoost = Math.min(campaign.budget_amount / 10, 20);
      score += budgetBoost;

      // Bid strategy adjustment
      if (campaign.bid_strategy === 'cost_cap') {
        score += 5;
      }

      // AI audience score
      if (campaign.ai_audience_score) {
        score += campaign.ai_audience_score / 10;
      }

      return { campaign, score };
    }).filter(Boolean);

    // Sort by score and return best match
    scoredCampaigns.sort((a, b) => b.score - a.score);

    if (scoredCampaigns.length === 0) {
      return Response.json({ ad: null });
    }

    // Weighted random selection from top 3
    const topCampaigns = scoredCampaigns.slice(0, 3);
    const totalScore = topCampaigns.reduce((sum, c) => sum + c.score, 0);
    const random = Math.random() * totalScore;
    
    let cumulative = 0;
    let selectedCampaign = topCampaigns[0].campaign;
    
    for (const { campaign, score } of topCampaigns) {
      cumulative += score;
      if (random <= cumulative) {
        selectedCampaign = campaign;
        break;
      }
    }

    return Response.json({ 
      ad: selectedCampaign,
      targeting_score: scoredCampaigns.find(c => c.campaign.id === selectedCampaign.id)?.score
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});