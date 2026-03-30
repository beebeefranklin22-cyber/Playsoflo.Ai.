import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driver_email, current_location, time_of_day } = await req.json();

    // Fetch driver stats and completed rides
    const driverStats = await base44.asServiceRole.entities.DriverStats.filter({
      driver_email: driver_email || user.email,
      period_type: "daily"
    });

    const completedRides = await base44.asServiceRole.entities.RideRequest.filter({
      driver_email: driver_email || user.email,
      status: "completed"
    });

    // Aggregate ride data for analysis
    const rideData = completedRides.map(ride => ({
      pickup_hour: new Date(ride.created_date).getHours(),
      day_of_week: new Date(ride.created_date).getDay(),
      pickup_coords: ride.pickup_coords,
      fare: ride.fare_breakdown?.total_fare || 0,
      distance: ride.actual_distance || ride.estimated_distance_miles || 0,
      duration: ride.estimated_duration_minutes || 0
    }));

    // Use AI to analyze patterns and predict demand
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a predictive analytics AI for a rideshare platform. Analyze the following driver data and provide actionable insights.

Driver Performance History:
- Total Rides: ${completedRides.length}
- Average Earnings Per Ride: $${(completedRides.reduce((sum, r) => sum + (r.fare_breakdown?.total_fare || 0), 0) / completedRides.length || 0).toFixed(2)}
- Recent Stats: ${JSON.stringify(driverStats.slice(0, 7))}

Historical Ride Data (sample):
${JSON.stringify(rideData.slice(-50))}

Current Context:
- Time: ${time_of_day || new Date().getHours()}:00
- Day: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
- Location: ${current_location ? `[${current_location[0]}, ${current_location[1]}]` : 'Unknown'}

Provide predictions and recommendations in the following JSON format:`,
      response_json_schema: {
        type: "object",
        properties: {
          demand_forecast: {
            type: "object",
            properties: {
              current_demand: { type: "string", enum: ["low", "medium", "high", "surge"] },
              next_hour_prediction: { type: "string" },
              peak_hours_today: { type: "array", items: { type: "string" } },
              high_demand_areas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area_name: { type: "string" },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    demand_level: { type: "string" },
                    distance_from_driver: { type: "string" }
                  }
                }
              }
            }
          },
          route_suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                destination: { type: "string" },
                reason: { type: "string" },
                estimated_rides_per_hour: { type: "number" },
                avg_fare: { type: "number" }
              }
            }
          },
          pricing_suggestions: {
            type: "object",
            properties: {
              suggested_rate_multiplier: { type: "number" },
              reasoning: { type: "string" },
              competitor_rates: { type: "string" }
            }
          },
          performance_feedback: {
            type: "object",
            properties: {
              overall_score: { type: "number" },
              strengths: { type: "array", items: { type: "string" } },
              improvement_areas: { type: "array", items: { type: "string" } },
              earning_optimization_tips: { type: "array", items: { type: "string" } },
              weekly_goal: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      insights: response,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Predictive insights error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});