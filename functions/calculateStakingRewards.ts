import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active stakes for the user
    const stakes = await base44.asServiceRole.entities.Staking.filter({
      user_email: user.email,
      status: 'active'
    });

    const now = new Date();
    let totalRewardsCalculated = 0;

    for (const stake of stakes) {
      const lastCalc = stake.last_reward_calculation ? new Date(stake.last_reward_calculation) : new Date(stake.start_date);
      const hoursSinceLastCalc = (now - lastCalc) / (1000 * 60 * 60);
      
      if (hoursSinceLastCalc >= 1) {
        // Calculate rewards: (amount * APY * hours) / (365 * 24)
        const hourlyRate = stake.apy / (365 * 24 * 100);
        const newRewards = stake.amount * hourlyRate * hoursSinceLastCalc;
        
        await base44.asServiceRole.entities.Staking.update(stake.id, {
          earned_rewards: (stake.earned_rewards || 0) + newRewards,
          last_reward_calculation: now.toISOString()
        });

        totalRewardsCalculated += newRewards;
      }

      // Check if staking period ended
      const endDate = new Date(stake.end_date);
      if (now >= endDate && stake.status === 'active') {
        await base44.asServiceRole.entities.Staking.update(stake.id, {
          status: 'completed'
        });
      }
    }

    return Response.json({ 
      success: true, 
      stakes_updated: stakes.length,
      total_rewards: totalRewardsCalculated
    });

  } catch (error) {
    console.error('Staking rewards error:', error);
    return Response.json({ 
      error: error.message || 'Failed to calculate rewards' 
    }, { status: 500 });
  }
});