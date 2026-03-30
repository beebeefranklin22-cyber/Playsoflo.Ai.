import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail } = await req.json();
    const targetEmail = userEmail || user.email;

    // Fetch user's orders and escrows
    const userOrders = await base44.asServiceRole.entities.P2POrder.filter({
      $or: [
        { seller_email: targetEmail },
        { buyer_email: targetEmail }
      ]
    });

    const userEscrows = await base44.asServiceRole.entities.P2PEscrow.filter({
      $or: [
        { seller_email: targetEmail },
        { buyer_email: targetEmail }
      ]
    });

    // Get all orders for market comparison
    const allOrders = await base44.asServiceRole.entities.P2POrder.filter({});

    // Calculate basic metrics
    const totalOrders = userOrders.length;
    const completedOrders = userOrders.filter(o => o.status === 'completed').length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    const totalVolume = userOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const completedVolume = userOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Calculate profit/loss (based on price differences)
    const profitLoss = userOrders
      .filter(o => o.status === 'completed')
      .map(o => {
        const marketPrice = allOrders
          .filter(mo => mo.crypto_currency === o.crypto_currency && mo.created_date)
          .reduce((sum, mo) => sum + mo.price_per_unit, 0) / 
          allOrders.filter(mo => mo.crypto_currency === o.crypto_currency).length;
        
        const priceDiff = o.price_per_unit - marketPrice;
        const profit = o.order_type === 'sell' ? priceDiff * o.crypto_amount : -priceDiff * o.crypto_amount;
        return profit;
      })
      .reduce((sum, profit) => sum + profit, 0);

    // Volume trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = userOrders.filter(o => new Date(o.created_date) > thirtyDaysAgo);
    
    const volumeTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayOrders = recentOrders.filter(o => {
        const orderDate = new Date(o.created_date);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });
      
      volumeTrend.push({
        date: dayStart.toISOString().split('T')[0],
        volume: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        orders: dayOrders.length
      });
    }

    // Trading pairs analysis
    const pairStats = {};
    userOrders.forEach(o => {
      const pair = `${o.crypto_currency}/USD`;
      if (!pairStats[pair]) {
        pairStats[pair] = { volume: 0, orders: 0, profit: 0 };
      }
      pairStats[pair].volume += o.total_amount || 0;
      pairStats[pair].orders += 1;
    });

    const topPairs = Object.entries(pairStats)
      .map(([pair, stats]) => ({ pair, ...stats }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    // Time analysis (best trading hours)
    const hourlyStats = Array(24).fill(0).map(() => ({ orders: 0, volume: 0 }));
    userOrders.forEach(o => {
      const hour = new Date(o.created_date).getHours();
      hourlyStats[hour].orders += 1;
      hourlyStats[hour].volume += o.total_amount || 0;
    });

    const bestHours = hourlyStats
      .map((stats, hour) => ({ hour, ...stats }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);

    // Market comparison
    const marketCompletionRate = allOrders.length > 0
      ? (allOrders.filter(o => o.status === 'completed').length / allOrders.length) * 100
      : 0;

    const marketAvgVolume = allOrders.length > 0
      ? allOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / allOrders.length
      : 0;

    const userAvgVolume = totalOrders > 0 ? totalVolume / totalOrders : 0;

    // AI-powered recommendations
    const recommendations = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a P2P trading strategy advisor. Analyze this trader's performance and provide actionable recommendations.

Trading Stats:
- Total Orders: ${totalOrders}
- Completion Rate: ${completionRate.toFixed(2)}%
- Market Avg Completion: ${marketCompletionRate.toFixed(2)}%
- Total Volume: $${totalVolume.toFixed(2)}
- Profit/Loss: $${profitLoss.toFixed(2)}
- Top Trading Pairs: ${topPairs.map(p => p.pair).join(', ')}
- Best Trading Hours: ${bestHours.map(h => `${h.hour}:00`).join(', ')}

Provide 3-5 specific, actionable recommendations to optimize their trading strategy.`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          overall_assessment: { type: "string" },
          strength_areas: { type: "array", items: { type: "string" } },
          improvement_areas: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      analytics: {
        overview: {
          total_orders: totalOrders,
          completed_orders: completedOrders,
          completion_rate: completionRate,
          total_volume: totalVolume,
          completed_volume: completedVolume,
          profit_loss: profitLoss
        },
        trends: {
          volume_trend: volumeTrend,
          profit_trend: volumeTrend.map(v => ({ ...v, profit: profitLoss / 30 }))
        },
        trading_pairs: topPairs,
        time_analysis: {
          best_hours: bestHours,
          hourly_distribution: hourlyStats
        },
        market_comparison: {
          user_completion_rate: completionRate,
          market_completion_rate: marketCompletionRate,
          user_avg_volume: userAvgVolume,
          market_avg_volume: marketAvgVolume,
          performance_score: completionRate > marketCompletionRate ? 'above_average' : 'below_average'
        },
        recommendations
      }
    });

  } catch (error) {
    console.error('Error calculating P2P analytics:', error);
    return Response.json({ 
      error: error.message || 'Failed to calculate analytics'
    }, { status: 500 });
  }
});