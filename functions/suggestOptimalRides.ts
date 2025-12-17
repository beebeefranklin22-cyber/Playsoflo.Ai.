import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate driver
    const driver = await base44.auth.me();
    if (!driver) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      driver_location, 
      available_rides, 
      current_time,
      driver_stats 
    } = await req.json();

    if (!driver_location || !available_rides || available_rides.length === 0) {
      return Response.json({ 
        error: 'Missing required parameters',
        required: ['driver_location', 'available_rides']
      }, { status: 400 });
    }

    // Fetch driver performance data
    const driverPerformance = await base44.asServiceRole.entities.DriverStats.filter({
      driver_email: driver.email
    });

    const stats = driverPerformance[0] || driver_stats || {
      total_rides: 0,
      rating: 5.0,
      acceptance_rate: 100,
      cancellation_rate: 0,
      earnings_today: 0
    };

    // Get recent ride history for pattern analysis
    const recentRides = await base44.asServiceRole.entities.RideRequest.filter({
      driver_email: driver.email,
      status: 'completed'
    });

    // Fetch demand predictions for the area
    let demandInsights = null;
    try {
      const insightsResponse = await base44.functions.invoke('getPredictiveInsights', {
        driver_email: driver.email,
        current_location: driver_location,
        time_of_day: current_time || new Date().getHours()
      });
      demandInsights = insightsResponse.data.insights;
    } catch (error) {
      console.log('Could not fetch demand insights:', error);
    }

    // Calculate distance for each ride
    const ridesWithDistance = available_rides.map(ride => ({
      ...ride,
      distance_to_pickup: calculateDistance(driver_location, ride.pickup_coords),
      estimated_earnings: calculateEstimatedEarnings(ride, stats)
    }));

    // Build context for AI analysis
    const analysisContext = {
      driver_location,
      driver_stats: {
        rating: stats.rating,
        acceptance_rate: stats.acceptance_rate,
        total_rides: stats.total_rides,
        earnings_today: stats.earnings_today,
        avg_earnings_per_ride: stats.total_rides > 0 ? stats.total_earnings / stats.total_rides : 0
      },
      current_time: current_time || new Date().getHours(),
      demand_forecast: demandInsights?.demand_forecast,
      recent_ride_patterns: analyzeRidePatterns(recentRides),
      available_rides: ridesWithDistance.slice(0, 10) // Limit to top 10 for AI analysis
    };

    // Use AI to analyze and rank rides
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI ride-matching optimizer for a rideshare platform. Analyze the following data to suggest the best ride(s) for this driver.

Driver Context:
- Current Location: [${driver_location[0]}, ${driver_location[1]}]
- Rating: ${stats.rating}/5.0
- Acceptance Rate: ${stats.acceptance_rate}%
- Total Rides Completed: ${stats.total_rides}
- Today's Earnings: $${stats.earnings_today}
- Average Earnings Per Ride: $${analysisContext.driver_stats.avg_earnings_per_ride.toFixed(2)}

Current Time: ${analysisContext.current_time}:00 (${getTimeCategory(analysisContext.current_time)})

Demand Forecast:
${demandInsights ? `
- Current Demand: ${demandInsights.demand_forecast?.current_demand}
- Next Hour: ${demandInsights.demand_forecast?.next_hour_prediction}
- Peak Hours Today: ${demandInsights.demand_forecast?.peak_hours_today?.join(', ')}
- Hot Zones: ${demandInsights.demand_forecast?.high_demand_areas?.map(a => a.area_name).join(', ')}
` : 'Not available'}

Recent Pattern Analysis:
${analysisContext.recent_ride_patterns}

Available Rides (${ridesWithDistance.length} total):
${ridesWithDistance.slice(0, 10).map((ride, i) => `
${i + 1}. ${ride.ride_type.toUpperCase()} Ride
   - Pickup: ${ride.pickup_address}
   - Dropoff: ${ride.dropoff_address}
   - Distance to Pickup: ${ride.distance_to_pickup.toFixed(2)} miles
   - Estimated Trip Distance: ${ride.estimated_distance_miles || 'N/A'} miles
   - Estimated Fare: $${ride.fare_breakdown?.total_fare || 0}
   - Estimated Earnings (90%): $${ride.estimated_earnings.toFixed(2)}
   - Scheduled: ${ride.is_scheduled ? 'Yes, at ' + ride.scheduled_time : 'Immediate'}
   - Passenger Rating: ${ride.passenger_rating || 'New user'}
   - Special Requests: ${ride.rider_preferences?.quiet_ride ? 'Quiet ride, ' : ''}${ride.rider_preferences?.no_perfume ? 'No perfume' : 'None'}
`).join('\n')}

Optimization Criteria (in order of importance):
1. **Profitability**: Maximize earnings per minute (fare ÷ (pickup time + trip time))
2. **Efficiency**: Minimize deadhead miles (distance to pickup)
3. **Strategic Positioning**: Rides ending in high-demand areas are more valuable
4. **Driver Performance**: Consider acceptance rate and need to maintain ratings
5. **Demand Timing**: Align with predicted surge periods
6. **Passenger Quality**: Prefer passengers with good ratings if available

Provide recommendations with:
- Top 3 ride suggestions ranked by overall value
- Detailed reasoning for each recommendation
- Expected earnings, time investment, and strategic value
- Alternative suggestions if driver has specific goals (maximize earnings vs minimize downtime)

Be concise but thorough. Focus on actionable insights.`,
      response_json_schema: {
        type: "object",
        properties: {
          top_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ride_index: { type: "number" },
                rank: { type: "number" },
                score: { type: "number" },
                reasoning: { type: "string" },
                estimated_time_to_complete: { type: "number" },
                earnings_per_minute: { type: "number" },
                strategic_value: { type: "string" },
                risk_factors: { type: "array", items: { type: "string" } }
              }
            }
          },
          market_conditions_summary: { type: "string" },
          alternative_strategy: { type: "string" },
          next_best_action: { type: "string" }
        }
      }
    });

    // Merge AI recommendations with actual ride data
    const recommendedRides = aiResponse.top_recommendations.map(rec => {
      const ride = ridesWithDistance[rec.ride_index];
      return {
        ...ride,
        ai_recommendation: {
          rank: rec.rank,
          score: rec.score,
          reasoning: rec.reasoning,
          estimated_time_to_complete: rec.estimated_time_to_complete,
          earnings_per_minute: rec.earnings_per_minute,
          strategic_value: rec.strategic_value,
          risk_factors: rec.risk_factors
        }
      };
    });

    return Response.json({
      success: true,
      recommended_rides: recommendedRides,
      market_summary: aiResponse.market_conditions_summary,
      alternative_strategy: aiResponse.alternative_strategy,
      next_best_action: aiResponse.next_best_action,
      total_available_rides: available_rides.length,
      analysis_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ride matching error:', error);
    return Response.json({ 
      error: error.message || 'Failed to suggest optimal rides',
      details: error.toString()
    }, { status: 500 });
  }
});

// Helper functions
function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return 0;
  
  const R = 3959; // Earth's radius in miles
  const lat1 = coord1[0] * Math.PI / 180;
  const lat2 = coord2[0] * Math.PI / 180;
  const deltaLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const deltaLon = (coord2[1] - coord1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateEstimatedEarnings(ride, stats) {
  const totalFare = ride.fare_breakdown?.total_fare || 0;
  const driverPercentage = stats.total_rides > 100 ? 0.90 : 0.88; // Higher rate for experienced drivers
  return totalFare * driverPercentage;
}

function analyzeRidePatterns(recentRides) {
  if (!recentRides || recentRides.length === 0) {
    return 'No recent ride history available';
  }

  const last10 = recentRides.slice(0, 10);
  const avgFare = last10.reduce((sum, r) => sum + (r.fare_breakdown?.total_fare || 0), 0) / last10.length;
  const avgDistance = last10.reduce((sum, r) => sum + (r.estimated_distance_miles || 0), 0) / last10.length;
  
  const mostCommonRideType = last10.reduce((acc, ride) => {
    acc[ride.ride_type] = (acc[ride.ride_type] || 0) + 1;
    return acc;
  }, {});
  
  const preferredType = Object.keys(mostCommonRideType).reduce((a, b) => 
    mostCommonRideType[a] > mostCommonRideType[b] ? a : b
  );

  return `Last 10 rides: Avg fare $${avgFare.toFixed(2)}, Avg distance ${avgDistance.toFixed(1)}mi, Preferred type: ${preferredType}`;
}

function getTimeCategory(hour) {
  if (hour >= 6 && hour < 9) return 'Morning Rush';
  if (hour >= 9 && hour < 12) return 'Mid-Morning';
  if (hour >= 12 && hour < 14) return 'Lunch Time';
  if (hour >= 14 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 20) return 'Evening Rush';
  if (hour >= 20 && hour < 23) return 'Night';
  return 'Late Night/Early Morning';
}